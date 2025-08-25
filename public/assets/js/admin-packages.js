let supabase;

async function handleAdminLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
    window.location.replace('/');
}

const protectAdminRoutes = async () => {
    const response = await fetch('/api/config');
    const config = await response.json();
    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/');
        return null;
    }
    // Simple protection, assumes role check is done on the server
    return session;
};

document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectAdminRoutes();
    if (!session) return;

    fetch('/_admin-nav.html')
        .then(res => res.text())
        .then(data => {
            const placeholder = document.getElementById('admin-nav-placeholder');
            if (placeholder) {
                placeholder.insertAdjacentHTML('beforebegin', data);
                placeholder.remove();
                document.getElementById('admin-logout-btn')?.addEventListener('click', handleAdminLogout);
            }
        });

    const path = window.location.pathname;

    if (path.endsWith('/admin-packages.html')) {
        const tableBody = document.getElementById('packages-table-body');
        const response = await fetch('/api/admin/packages', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!response.ok) {
            tableBody.innerHTML = '<tr><td colspan="5">Error loading packages.</td></tr>';
            return;
        }
        const packages = await response.json();
        tableBody.innerHTML = packages.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.price_complete)}</td>
                <td><span class="status-${p.is_active}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <a href="/admin-edit-package.html?id=${p.id}">Edit</a>
                </td>
            </tr>
        `).join('');

    } else if (path.endsWith('/admin-add-package.html')) {
        const form = document.getElementById('package-form');
        const feedbackEl = document.getElementById('form-feedback');
        const imageUploadInput = document.getElementById('image-upload');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        let imageUrl = null;

        imageUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            feedbackEl.textContent = 'Uploading image...';
            const formData = new FormData();
            formData.append('productImage', file);

            const response = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                imageUrl = result.imageUrl;
                imagePreviewContainer.innerHTML = `<img src="${imageUrl}" style="width: 100%; object-fit: contain;">`;
                feedbackEl.textContent = 'Upload complete.';
            } else {
                alert('Image upload failed.');
                feedbackEl.textContent = 'Upload failed.';
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!imageUrl) {
                alert('Please upload an image for the package.');
                return;
            }
            
const packageData = {
    name: form.elements.name.value,
    price_complete: parseFloat(form.elements.price_complete.value.replace(/,/g, '')),
    price_unit_only: parseFloat(form.elements.price_unit_only.value.replace(/,/g, '')),
    description: form.elements.description.value,
    category: form.elements.category.value,
    is_active: form.elements.is_active.value === 'true',
    image_url: imageUrl
};

            const response = await fetch('/api/admin/packages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(packageData)
            });

            if (response.ok) {
                window.location.href = '/admin-packages.html';
            } else {
                const result = await response.json();
                feedbackEl.textContent = `Error: ${result.error || 'Failed to save package.'}`;
            }
        });
    }
});