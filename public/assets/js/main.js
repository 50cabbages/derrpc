// public/assets/js/main.js

// --- SUPABASE CLIENT-SIDE INITIALIZATION ---
let supabase;

async function initializeSupabase() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        // The 'supabase' global object comes from the script we added to the HTML head
        supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    } catch (error) {
        console.error("Error initializing Supabase client:", error);
    }
}


// --- API HELPER FUNCTIONS ---

async function fetchProducts(category = '') {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        let products = await response.json();
        
        if (category) {
            products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        return products;
    } catch (error) {
        console.error("Failed to fetch products from API:", error);
        return [];
    }
}

async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function fetchBrands() {
    try {
        const response = await fetch('/api/brands');
        if (!response.ok) throw new Error('Failed to fetch brands');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function fetchProductById(id) {
    const products = await fetchProducts();
    return products.find(p => p.id === id);
}


// --- RENDERING FUNCTIONS ---

function createProductCard(product) {
    const formattedPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(product.price);
    return `
        <div class="product-card">
            <a href="product-detail.html?id=${product.id}" class="product-card-image">
                <img src="${product.image || 'https://via.placeholder.com/400x300.png?text=No+Image'}" alt="${product.name}">
            </a>
            <div class="product-card-content">
                <div>
                    <p class="product-card-category">${product.category}</p>
                    <h3 class="product-card-title">
                        <a href="product-detail.html?id=${product.id}">${product.name}</a>
                    </h3>
                </div>
                <div class="product-card-footer">
                    <span class="product-card-price">${formattedPrice}</span>
                    <button class="btn btn-primary add-to-cart-btn" 
                            data-product-id="${product.id}"
                            data-product-name="${product.name}"
                            data-product-price="${product.price}"
                            data-product-image="${product.image || ''}">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderProductDetail(product) {
    const formattedPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(product.price);
    return `
        <div class="product-detail-layout">
            <div class="product-image-gallery">
                <img src="${product.image || 'https://via.placeholder.com/600x400.png?text=No+Image'}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h1 class="product-info-title">${product.name}</h1>
                <p class="product-info-price">${formattedPrice}</p>
                <p class="product-info-description">${product.description}</p>
                <div class="product-actions">
                    <div class="quantity-selector">
                        <button class="quantity-minus">-</button>
                        <input type="number" value="1" min="1" readonly>
                        <button class="quantity-plus">+</button>
                    </div>
                    <button class="btn btn-primary add-to-cart-btn" style="flex-grow: 1;"
                            data-product-id="${product.id}"
                            data-product-name="${product.name}"
                            data-product-price="${product.price}"
                            data-product-image="${product.image || ''}">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

function displayProducts(container, products) {
    if (!container) return;
    container.innerHTML = products.length > 0 ? products.map(createProductCard).join('') : "<h2>No products found for this category.</h2>";
}


// --- CART UI FUNCTIONS ---

function updateCartUI() {
    renderCartItems();
    updateCartIcon();
}

function updateCartIcon() {
    const badge = document.getElementById('cart-count-badge');
    if (badge) {
        const count = cart.getItemCount();
        badge.textContent = count;
        badge.classList.toggle('visible', count > 0);
    }
}

function renderCartItems() {
    const cartList = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal');
    if (!cartList || !subtotalEl) return;
    const items = cart.getItems();
    if (items.length === 0) {
        cartList.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    } else {
        cartList.innerHTML = items.map(item => `
            <div class="cart-item" data-product-id="${item.id}">
                <img src="${item.image || 'https://via.placeholder.com/100x100.png?text=No+Image'}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <p class="cart-item-title">${item.name}</p>
                    <p class="cart-item-price">${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.price)}</p>
                    <div class="cart-item-actions">
                        <div class="cart-item-quantity-selector">
                            <button class="quantity-decrease">-</button>
                            <input type="number" value="${item.quantity}" min="1" readonly>
                            <button class="quantity-increase">+</button>
                        </div>
                        <button class="cart-item-remove-btn">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    const subtotal = cart.getTotalPrice();
    subtotalEl.textContent = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(subtotal);
}

function toggleCartPanel() {
    const panel = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    if (!panel || !overlay) return;
    panel.classList.toggle('is-open');
    const isVisible = overlay.classList.toggle('visible');
    if (isVisible) {
        overlay.classList.remove('hidden');
    } else {
        setTimeout(() => {
            if (!overlay.classList.contains('visible')) {
                overlay.classList.add('hidden');
            }
        }, 300);
    }
}


// --- AUTHENTICATION UI & ACTIONS ---

function updateAuthUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    if (loginBtn && userInfo) {
        if (user) {
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            const displayNameContainer = document.getElementById('user-display-name');
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
            displayNameContainer.textContent = fullName ? fullName.split(' ')[0] : user.email;
        } else {
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
        }
    }
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error during client-side logout:', error);
}


// --- MAIN INITIALIZATION LOGIC ---
document.addEventListener('DOMContentLoaded', async () => {
    await initializeSupabase();

    const loadComponent = (url, placeholderId) => {
        return fetch(url).then(response => response.text()).then(data => {
            const placeholder = document.getElementById(placeholderId);
            if (placeholder) placeholder.innerHTML = data;
        }).catch(error => console.error(`Failed to load ${url}:`, error));
    };

    // --- INITIAL LOAD & SETUP ---
    
    await Promise.all([
        loadComponent('_header.html', 'header-placeholder'),
        loadComponent('_cart-panel.html', 'cart-panel-placeholder')
    ]);

    document.getElementById('cart-btn')?.addEventListener('click', toggleCartPanel);
    document.getElementById('close-cart-btn')?.addEventListener('click', toggleCartPanel);
    document.getElementById('cart-overlay')?.addEventListener('click', toggleCartPanel);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    if (supabase) {
        supabase.auth.onAuthStateChange((_event, session) => {
            updateAuthUI(session?.user || null);
        });
    }

    updateCartUI();
    loadComponent('_footer.html', 'footer-placeholder');

    // --- EVENT DELEGATION FOR DYNAMIC CONTENT ---
    
    document.body.addEventListener('click', event => {
        const target = event.target;
        if (target.classList.contains('add-to-cart-btn')) {
            const product = {
                id: parseInt(target.dataset.productId),
                name: target.dataset.productName,
                price: parseFloat(target.dataset.productPrice),
                image: target.dataset.productImage,
            };
            cart.addItem(product);
            updateCartUI();
            const panel = document.getElementById('cart-panel');
            if (panel && !panel.classList.contains('is-open')) {
                toggleCartPanel();
            }
        }
        const cartItem = target.closest('.cart-item');
        if (cartItem) {
            const productId = parseInt(cartItem.dataset.productId);
            const currentQuantity = cart.getItems().find(i => i.id === productId)?.quantity || 0;
            if (target.classList.contains('quantity-increase')) {
                cart.updateItemQuantity(productId, currentQuantity + 1);
            } else if (target.classList.contains('quantity-decrease')) {
                cart.updateItemQuantity(productId, currentQuantity - 1);
            } else if (target.classList.contains('cart-item-remove-btn')) {
                cart.removeItem(productId);
            }
            updateCartUI();
        }
    });
    
    // --- PAGE-SPECIFIC LOGIC ---
    const path = window.location.pathname;

    if (path.endsWith('/') || path.endsWith('/index.html')) {
        const [products, categories, brands] = await Promise.all([ fetchProducts(), fetchCategories(), fetchBrands() ]);
        displayProducts(document.getElementById('featured-product-grid'), products.slice(0, 4));
        const categoryGrid = document.getElementById('category-grid');
        if (categoryGrid) {
            const categoryList = document.createElement('div');
            categoryList.className = 'category-list';
            const generateCategoryHTML = (cat) => `<a href="products.html?category=${encodeURIComponent(cat.name)}" class="category-card"><div class="icon-container"><img src="${cat.image_url || ''}" alt="${cat.name}"></div><h3>${cat.name}</h3></a>`;
            const originalHTML = categories.map(generateCategoryHTML).join('');
            categoryList.innerHTML = originalHTML + originalHTML;
            categoryGrid.innerHTML = '';
            categoryGrid.appendChild(categoryList);
        }
        const brandLogosContainer = document.getElementById('brand-logos-container');
        if (brandLogosContainer) {
            const generateBrandHTML = (brand) => `<div class="brand-card"><img src="${brand.logo_url}" alt="${brand.name}"></div>`;
            const originalHTML = brands.map(generateBrandHTML).join('');
            brandLogosContainer.innerHTML = originalHTML + originalHTML + (brands.length < 8 ? originalHTML : '');
        }
    } else if (path.endsWith('/products.html')) {
        const productsGrid = document.getElementById('products-grid');
        const categoryFiltersContainer = document.getElementById('category-filters');
        const categories = await fetchCategories();
        if (categoryFiltersContainer) {
            const allProductsLink = '<li><a href="products.html" data-category="All Products">All Products</a></li>';
            const categoryLinks = categories.map(cat => `<li><a href="products.html?category=${encodeURIComponent(cat.name)}" data-category="${cat.name}">${cat.name}</a></li>`).join('');
            categoryFiltersContainer.innerHTML = allProductsLink + categoryLinks;
        }
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        document.querySelectorAll('#category-filters a').forEach(a => a.classList.remove('active'));
        const activeLink = category ? document.querySelector(`#category-filters a[data-category="${category}"]`) : document.querySelector('#category-filters a[data-category="All Products"]');
        if (activeLink) activeLink.classList.add('active');
        const products = await fetchProducts(category);
        displayProducts(productsGrid, products);
    } else if (path.endsWith('/product-detail.html')) {
        const contentDiv = document.getElementById('product-detail-content');
        const params = new URLSearchParams(window.location.search);
        const productId = parseInt(params.get('id'));
        if (contentDiv && productId) {
            const product = await fetchProductById(productId);
            if (product) {
                document.title = `${product.name} - DRE Computer Center`;
                contentDiv.innerHTML = renderProductDetail(product);
            } else {
                contentDiv.innerHTML = '<h2>Product not found</h2>';
            }
        }
    } else if (path.endsWith('/profile.html')) {
        const form = document.getElementById('profile-form');
        const feedbackEl = document.getElementById('form-feedback');
        const editBtn = document.getElementById('edit-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        let currentProfileData = {};

        const populateProfileData = (profile) => {
            currentProfileData = profile;
            for (const key in profile) {
                const viewEl = document.querySelector(`.profile-data-value[data-field="${key}"]`);
                if (viewEl) viewEl.textContent = profile[key] || 'Not set';
                const inputEl = form.elements[key];
                if (inputEl) inputEl.value = profile[key] || '';
            }
        };

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/';
            return;
        }
        const accessToken = session.access_token;
        const response = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const profile = await response.json();
            populateProfileData(profile);
        } else {
            console.error('Failed to fetch profile, redirecting.');
            window.location.href = '/';
        }

        const renderOrderHistory = (orders) => {
    const container = document.getElementById('order-history-container');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p>You have no past orders.</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <h4>Order #${order.id}</h4>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        Placed on ${new Date(order.created_at).toLocaleDateString()}
                    </p>
                </div>
                <span class="order-status">${order.status}</span>
            </div>
            <div class="order-body">
                ${order.order_items.map(item => `
                    <div class="order-item">
                        <img src="${item.products.image || 'https://via.placeholder.com/100x100.png?text=No+Image'}" alt="${item.products.name}" class="order-item-image">
                        <div class="order-item-details">
                            <p>${item.products.name}</p>
                            <p style="font-size: 0.9rem; color: var(--text-secondary);">
                                ${item.quantity} x ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.price_at_purchase)}
                            </p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order-footer">
                Total: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.total_price)}
            </div>
        </div>
    `).join('');
};

// Fetch and render the order history
const orderResponse = await fetch('/api/orders', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
});

if (orderResponse.ok) {
    const orders = await orderResponse.json();
    renderOrderHistory(orders);
} else {
    document.getElementById('order-history-container').innerHTML = '<p>Could not load order history.</p>';
}

        editBtn.addEventListener('click', () => {
            form.classList.remove('view-mode');
            form.classList.add('edit-mode');
        });

        cancelBtn.addEventListener('click', () => {
            populateProfileData(currentProfileData); 
            form.classList.remove('edit-mode');
            form.classList.add('view-mode');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const profileData = Object.fromEntries(formData.entries());

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const updateResponse = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(profileData)
            });

            if (updateResponse.ok) {
                const result = await updateResponse.json();
                populateProfileData(result.profile);
                form.classList.remove('edit-mode');
                form.classList.add('view-mode');
                feedbackEl.textContent = 'Profile updated successfully!';
                feedbackEl.className = 'form-feedback success';
            } else {
                feedbackEl.textContent = 'Failed to update profile. Please try again.';
                feedbackEl.className = 'form-feedback error';
            }
            setTimeout(() => { feedbackEl.textContent = '' }, 3000);
        });
    } else if (path.endsWith('/checkout.html')) {
    const checkoutContent = document.getElementById('checkout-content');
    
    // Protect the route
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/'; // Redirect if not logged in
        return;
    }

    const cartItems = cart.getItems();
    if (cartItems.length === 0) {
        checkoutContent.innerHTML = '<h2>Your cart is empty.</h2><a href="/products.html">Go shopping</a>';
        return;
    }
    
    const subtotal = cart.getTotalPrice();
    const formattedSubtotal = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(subtotal);

    // Fetch user's profile for shipping info
    const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    const profile = await response.json();
    
    const address = [
        profile.address_line1,
        profile.address_line2,
        profile.city,
        profile.province,
        profile.postal_code
    ].filter(Boolean).join(', '); // Join parts that exist

    checkoutContent.innerHTML = `
        <h3>Order Summary</h3>
        <ul>
            ${cartItems.map(item => `<li>${item.name} (x${item.quantity}) - ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.price * item.quantity)}</li>`).join('')}
        </ul>
        <hr style="margin: 1rem 0;">
        <p><strong>Total: ${formattedSubtotal}</strong></p>
        
        <h3>Shipping To:</h3>
        <p>${profile.full_name}</p>
        <p>${address || 'No address set. Please <a href="/profile.html">update your profile</a>.'}</p>
        <br>
        <button id="place-order-btn" class="btn btn-primary" ${!address ? 'disabled' : ''}>Place Order</button>
    `;

    document.getElementById('place-order-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('place-order-btn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ cartItems: cart.getItems() })
        });

        if (orderResponse.ok) {
            const result = await orderResponse.json();
            cart.clearCart(); // Clear cart on success
            updateCartUI();
            window.location.href = `/order-success.html?orderId=${result.order.id}`;
        } else {
            alert('Failed to place order. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Place Order';
        }
    });

} else if (path.endsWith('/order-success.html')) {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
        document.getElementById('order-id-display').textContent = `Your Order ID is #${orderId}.`;
    }
} else if (path.endsWith('/admin-products.html')) {
    const tableBody = document.getElementById('products-table-body');
    const adminContent = document.getElementById('admin-content');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        adminContent.innerHTML = '<h1>Access Denied</h1><p>Please log in as an admin.</p>';
        return;
    }

    const response = await fetch('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (response.status === 403) { // Forbidden
         adminContent.innerHTML = '<h1>Access Denied</h1><p>You do not have permission to view this page.</p>';
         return;
    }
    
    if (!response.ok) {
        adminContent.innerHTML = '<h1>Error</h1><p>Could not load product data.</p>';
        return;
    }

    const products = await response.json();
    
    tableBody.innerHTML = products.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.price)}</td>
            <td class="action-btn-group">
                <a href="/admin-edit-product.html?id=${p.id}">Edit</a>
                <button>Delete</button>
            </td>
        </tr>
    `).join('');
}  else if (path.endsWith('/admin-add-product.html')) {
    const form = document.getElementById('add-product-form');
    const feedbackEl = document.getElementById('form-feedback');

    // Protect the route
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/'; // Redirect if not logged in
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());

        // Convert price to a number
        productData.price = parseFloat(productData.price);

        const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            // Success, redirect back to the product list
            window.location.href = '/admin-products.html';
        } else if (response.status === 403) {
             feedbackEl.textContent = 'Error: You do not have permission to perform this action.';
             feedbackEl.className = 'form-feedback error';
        } else {
            const result = await response.json();
            feedbackEl.textContent = `Error: ${result.error || 'Failed to add product.'}`;
            feedbackEl.className = 'form-feedback error';
        }
    });
} else if (path.endsWith('/admin-edit-product.html')) {
    const form = document.getElementById('edit-product-form');
    const feedbackEl = document.getElementById('form-feedback');
    const pageTitle = document.getElementById('page-title');
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('image-preview');

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        form.innerHTML = '<p>No product ID provided. Go back to the <a href="/admin-products.html">product list</a>.</p>';
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/';
        return;
    }

    // --- Function to update the image preview ---
    const updateImagePreview = () => {
        const url = imageInput.value;
        if (url) {
            imagePreview.src = url;
            imagePreview.style.display = 'block';
            imagePreview.onerror = () => {
                // If the link is broken, hide it again
                imagePreview.style.display = 'none';
            };
        } else {
            imagePreview.style.display = 'none';
        }
    };
    
    // --- Fetch existing data and populate the form ---
    const populateForm = async () => {
        const response = await fetch(`/api/admin/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) {
            form.innerHTML = `<p>Error: Could not load product data. Make sure you are logged in as an admin.</p>`;
            return;
        }

        const product = await response.json();
        
        pageTitle.textContent = `Edit Product: ${product.name}`;
        
        // Populate all form fields
        form.elements.name.value = product.name;
        form.elements.category.value = product.category;
        form.elements.price.value = product.price;
        form.elements.image.value = product.image || '';
        form.elements.description.value = product.description || '';
        
        // Trigger the preview for the initially loaded image
        updateImagePreview(); 
    };
    
    await populateForm();

    // --- Add event listener for real-time preview updates ---
    imageInput.addEventListener('input', updateImagePreview);

    // --- Handle form submission ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());
        productData.price = parseFloat(productData.price);

        const updateResponse = await fetch(`/api/admin/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(productData)
        });

        if (updateResponse.ok) {
            window.location.href = '/admin-products.html';
        } else {
            const result = await updateResponse.json();
            feedbackEl.textContent = `Error: ${result.error || 'Failed to update product.'}`;
            feedbackEl.className = 'form-feedback error';
        }
    });
}
});