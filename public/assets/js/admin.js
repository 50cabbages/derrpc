let supabase;

async function handleAdminLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
    }
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

    const profileResponse = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!profileResponse.ok) {
         window.location.replace('/');
         return null;
    }

    const profile = await profileResponse.json();
    if (profile.role !== 'admin') {
        window.location.replace('/');
        return null;
    }
    
    return session;
};

document.addEventListener('DOMContentLoaded', async () => {
    const initialSession = await protectAdminRoutes();
    if (!initialSession) return;

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

    if (path.endsWith('/admin-products.html')) {
        const tableBody = document.getElementById('products-table-body');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return handleAdminLogout();

        const response = await fetch('/api/admin/products', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) {
            tableBody.innerHTML = '<tr><td colspan="6">Error loading products.</td></tr>';
            return;
        }

        const products = await response.json();
        tableBody.innerHTML = products.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.price)}</td>
                <td>${p.stock}</td>
                <td class="action-btn-group">
                    <a href="/admin-edit-product.html?id=${p.id}">Edit</a>
                    <button class="delete-product-btn" data-product-id="${p.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        tableBody.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-product-btn')) {
                const { data: { session: freshSession } } = await supabase.auth.getSession();
                if (!freshSession) return handleAdminLogout();

                const button = event.target;
                const productId = button.dataset.productId;
                const productName = button.closest('tr').cells[1].textContent;

                const isConfirmed = confirm(`Are you sure you want to delete "${productName}"?`);
                if (isConfirmed) {
                    const deleteResponse = await fetch(`/api/admin/products/${productId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${freshSession.access_token}` }
                    });
                    if (deleteResponse.ok) {
                        button.closest('tr').remove();
                    } else {
                        alert('Failed to delete product.');
                    }
                }
            }
        });

    } else if (path.endsWith('/admin-add-products.html') || path.endsWith('/admin-edit-product.html')) {
    const isEditMode = path.endsWith('/admin-edit-product.html');
    const form = document.getElementById('product-form');
    const feedbackEl = document.getElementById('form-feedback');
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const specFieldsContainer = document.getElementById('spec-fields-container');
    const addSpecBtn = document.getElementById('add-spec-btn');
    const brandSelect = document.getElementById('brand_id');
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    let imageUrls = [];
    let originalImageUrls = [];

    async function loadBrands() {
        const { data, error } = await supabase.from('brands').select('id, name');
        if (error) {
            console.error('Error fetching brands:', error);
            return;
        }
        brandSelect.innerHTML = '<option value="">Select a Brand</option>';
        brandSelect.innerHTML += data.map(brand => `<option value="${brand.id}">${brand.name}</option>`).join('');
    }

    const renderImagePreviews = () => {
        imagePreviewContainer.innerHTML = imageUrls.map((url, index) => `
            <div class="img-preview-wrapper" data-url="${url}">
                <img src="${url}" alt="Product image preview ${index + 1}">
                <button type="button" class="img-remove-btn" data-index="${index}">&times;</button>
            </div>
        `).join('');
    };

    const addSpecField = (key = '', value = '') => {
        const div = document.createElement('div');
        div.className = 'spec-field-group';
        div.innerHTML = `
            <input type="text" class="form-input spec-key" placeholder="Specification Name" value="${key}">
            <input type="text" class="form-input spec-value" placeholder="Specification Value" value="${value}">
            <button type="button" class="spec-remove-btn">-</button>
        `;
        specFieldsContainer.appendChild(div);
    };

    addSpecBtn.addEventListener('click', () => addSpecField());

    specFieldsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('spec-remove-btn')) {
            e.target.closest('.spec-field-group').remove();
        }
    });

    imagePreviewContainer.addEventListener('click', e => {
        if (e.target.classList.contains('img-remove-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            imageUrls.splice(index, 1);
            renderImagePreviews();
        }
    });

    imageUploadInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        feedbackEl.textContent = 'Uploading images...';
        feedbackEl.className = 'form-feedback';

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return handleAdminLogout();

        for (const file of files) {
            const formData = new FormData();
            formData.append('productImage', file);
            
            const response = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                if (imageUrls.length < 4) imageUrls.push(result.imageUrl);
            } else {
                alert('An image failed to upload.');
            }
        }
        renderImagePreviews();
        feedbackEl.textContent = '';
    });

    await loadBrands();

    if (isEditMode && productId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return handleAdminLogout();

        const response = await fetch(`/api/admin/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const product = await response.json();
        form.elements.name.value = product.name || '';
        form.elements.category.value = product.category || '';
        form.elements.price.value = product.price || '';
        form.elements.sale_price.value = product.sale_price || '';
        form.elements.description.value = product.description || '';
        form.elements.stock.value = product.stock || 0;
        form.elements.brand_id.value = product.brand_id || '';
        
        imageUrls = [product.image, product.image_2, product.image_3, product.image_4].filter(Boolean);
        originalImageUrls = [...imageUrls];
        renderImagePreviews();

        if (product.specifications) {
            Object.entries(product.specifications).forEach(([key, value]) => addSpecField(key, value));
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return handleAdminLogout();

        const productData = {
            name: form.elements.name.value,
            category: form.elements.category.value,
            price: parseFloat(String(form.elements.price.value).replace(/,/g, '')),
            sale_price: form.elements.sale_price.value ? parseFloat(String(form.elements.sale_price.value).replace(/,/g, '')) : null,
            description: form.elements.description.value,
            stock: parseInt(form.elements.stock.value, 10),
            brand_id: form.elements.brand_id.value ? parseInt(form.elements.brand_id.value, 10) : null,
            image: imageUrls[0] || null,
            image_2: imageUrls[1] || null,
            image_3: imageUrls[2] || null,
            image_4: imageUrls[3] || null,
            originalImages: originalImageUrls
        };

        const specifications = {};
        specFieldsContainer.querySelectorAll('.spec-field-group').forEach(group => {
            const key = group.querySelector('.spec-key').value.trim();
            const value = group.querySelector('.spec-value').value.trim();
            if (key && value) specifications[key] = value;
        });
        productData.specifications = specifications;
        
        const url = isEditMode ? `/api/admin/products/${productId}` : '/api/admin/products';
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            window.location.href = '/admin-products.html';
        } else {
            const result = await response.json();
            feedbackEl.textContent = `Error: ${result.error || 'Failed to save product.'}`;
            feedbackEl.className = 'form-feedback error';
        }
    });
} else if (path.endsWith('/admin-orders.html')) {
        const tableBody = document.getElementById('orders-table-body');
        const modalOverlay = document.getElementById('order-modal-overlay');
        const modalContent = document.getElementById('order-modal');

        const renderOrders = (orders) => {
            if (orders.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No orders found.</td></tr>';
                return;
            }

            tableBody.innerHTML = orders.map(order => `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.profiles ? order.profiles.full_name : 'N/A'}</td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td>${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.total_price)}</td>
                    <td><span class="order-status">${order.status}</span></td>
                    <td class="action-btn-group">
                        <a href="#" class="view-details-btn" data-order-id="${order.id}">View Details</a>
                    </td>
                </tr>
            `).join('');
        };

        const fetchAndRenderOrders = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return handleAdminLogout();

            const response = await fetch('/api/admin/orders', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) {
                tableBody.innerHTML = '<tr><td colspan="6">Error loading orders.</td></tr>';
                return;
            }

            const orders = await response.json();
            renderOrders(orders);
        };

        const openModalWithOrder = async (orderId) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return handleAdminLogout();

            const response = await fetch(`/api/admin/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!response.ok) {
                alert('Could not fetch order details.');
                return;
            }
            const order = await response.json();

            modalContent.innerHTML = `
                <div class="modal-header">
                    <h3>Order #${order.id}</h3>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-details-grid">
                        <div><strong>Customer:</strong> ${order.profiles.full_name}</div>
                        <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</div>
                        <div><strong>Total:</strong> ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.total_price)}</div>
                        <div>
                            <strong>Current Status:</strong> 
                            <span class="order-status">${order.status}</span>
                        </div>
                    </div>
                    <div class="order-items-list">
                        <h4>Items</h4>
                        ${order.order_items.map(item => `
                            <div class="order-item">
                               <img src="${item.products.image || 'https://via.placeholder.com/60x60.png'}" class="order-item-image" alt="${item.products.name}">
                               <p>${item.products.name} (x${item.quantity})</p>
                            </div>
                        `).join('')}
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <label for="status-select">Update Status</label>
                        <select id="status-select" class="status-select">
                            <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                            <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button id="update-status-btn" class="btn btn-primary" data-order-id="${order.id}">Update</button>
                    </div>
                </div>
            `;
            modalOverlay.style.display = 'flex';
        };

        const closeModal = () => {
            modalOverlay.style.display = 'none';
            modalContent.innerHTML = '';
        };
        
        await fetchAndRenderOrders();

        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details-btn')) {
                e.preventDefault();
                const orderId = e.target.dataset.orderId;
                openModalWithOrder(orderId);
            }
        });

        modalOverlay.addEventListener('click', async (e) => {
            if (e.target === modalOverlay || e.target.classList.contains('modal-close-btn')) {
                closeModal();
            }
            if (e.target.id === 'update-status-btn') {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return handleAdminLogout();

                const orderId = e.target.dataset.orderId;
                const newStatus = document.getElementById('status-select').value;
                
                try {
                    const res = await fetch(`/api/admin/orders/${orderId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({ status: newStatus })
                    });

                    if (!res.ok) {
                        throw new Error('Failed to update status');
                    }

                    const data = await res.json();
                    if (data.order) {
                        closeModal();
                        fetchAndRenderOrders(); 
                    } else {
                        alert('Failed to update status.');
                    }
                } catch (error) {
                    console.error('Update status error:', error);
                    alert('An error occurred. Please try again.');
                }
            }
        });
    }
});