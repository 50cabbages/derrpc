let supabase;

async function initializeSupabase() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    } catch (error) {
        console.error("Error initializing Supabase client:", error);
    }
}

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

function createProductCard(product) {
    let priceHTML;
    let saleTagHTML = ''; 
    const displayPrice = product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;

    const formattedDisplayPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(displayPrice);

    if (product.sale_price && product.sale_price > 0) {
        const formattedOriginalPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(product.price);
        priceHTML = `
            <div class="product-card-price-container">
                <span class="original-price">${formattedOriginalPrice}</span>
                <span class="sale-price">${formattedDisplayPrice}</span>
            </div>
        `;
        saleTagHTML = '<div class="sale-tag">Sale</div>';
    } else {
        priceHTML = `<span class="product-card-price">${formattedDisplayPrice}</span>`;
    }

    return `
        <div class="product-card">
            ${saleTagHTML} 
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
                    ${priceHTML}
                    <button class="btn btn-primary add-to-cart-btn" 
                            data-product-id="${product.id}"
                            data-product-name="${product.name}"
                            data-product-price="${displayPrice}"
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

    container.innerHTML = ''; 

    if (products.length > 0) {
        const fragment = document.createDocumentFragment();
        products.forEach(product => {
            const card = document.createElement('div');
            card.innerHTML = createProductCard(product).trim();
            fragment.appendChild(card.firstChild);
        });
        container.appendChild(fragment);
    } else {
        container.innerHTML = "<h2>No products found.</h2>";
    }
}

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

function updateAuthUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const mainNavUl = document.querySelector('#main-nav-links ul');

    // Remove any existing dynamic links first to prevent duplicates
    mainNavUl?.querySelector('.dynamic-auth-link')?.remove();

    if (loginBtn && userInfo) {
        if (user) {
            // --- Desktop Header ---
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            const displayNameContainer = document.getElementById('user-display-name');
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
            displayNameContainer.textContent = fullName ? fullName.split(' ')[0] : user.email;

            // --- Mobile Menu (Add Profile Link) ---
            if (mainNavUl) {
                const profileLi = document.createElement('li');
                profileLi.className = 'dynamic-auth-link';
                profileLi.innerHTML = `<a href="/profile.html">My Profile</a>`;
                mainNavUl.appendChild(profileLi);
            }

        } else {
            // --- Desktop Header ---
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');

            // --- Mobile Menu (Add Login Link) ---
             if (mainNavUl) {
                const loginLi = document.createElement('li');
                loginLi.className = 'dynamic-auth-link';
                loginLi.innerHTML = `<a href="/api/auth/google">Login</a>`;
                mainNavUl.appendChild(loginLi);
            }
        }
    }
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error during client-side logout:', error);
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeSupabase();

    const loadComponent = (url, placeholderId) => {
        return fetch(url).then(response => response.text()).then(data => {
            const placeholder = document.getElementById(placeholderId);
            if (placeholder) placeholder.innerHTML = data;
        }).catch(error => console.error(`Failed to load ${url}:`, error));
    };
    
    await Promise.all([
        loadComponent('_header.html', 'header-placeholder'),
        loadComponent('_cart-panel.html', 'cart-panel-placeholder')
    ]);

    document.getElementById('header-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = e.target.elements.q.value;
    if (searchTerm) {
        window.location.href = `/search-results.html?q=${encodeURIComponent(searchTerm)}`;
    }
});

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mainNav = document.getElementById('main-nav-links');
const menuOverlay = document.getElementById('mobile-menu-overlay');

const toggleMobileMenu = () => {
    const isOpen = mainNav.classList.toggle('is-open');
    menuOverlay.classList.toggle('is-open');
    document.body.classList.toggle('mobile-menu-open', isOpen);
};

mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
menuOverlay?.addEventListener('click', toggleMobileMenu);

document.getElementById('cart-btn')?.addEventListener('click', toggleCartPanel);

    document.getElementById('cart-btn')?.addEventListener('click', toggleCartPanel);
    document.getElementById('close-cart-btn')?.addEventListener('click', toggleCartPanel);
    document.getElementById('cart-overlay')?.addEventListener('click', toggleCartPanel);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    if (supabase) {
        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                const response = await fetch('/api/profile', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                
                if (response.ok) {
                    const profile = await response.json();
                    if (profile.role === 'admin') {
                        if (!window.location.pathname.startsWith('/admin')) {
                            window.location.replace('/admin.html');
                            return;
                        }
                    }
                }
            }
            updateAuthUI(session?.user || null);
        });
    }

    updateCartUI();
    loadComponent('_footer.html', 'footer-placeholder');
    
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
            const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const categoryFilters = document.getElementById('category-filters');
    toggleFiltersBtn?.addEventListener('click', () => {
        categoryFilters?.classList.toggle('is-open');
    });
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

    if (!productId) {
        contentDiv.innerHTML = '<h2>Product ID not found.</h2>';
        return;
    }

    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
        contentDiv.innerHTML = '<h2>Product not found.</h2>';
        return;
    }

    const product = await response.json();
    document.title = `${product.name} - DRE Computer Center`;

    const images = [product.image, product.image_2, product.image_3, product.image_4].filter(Boolean); 

    const originalPriceHTML = product.sale_price 
        ? `<span class="original-price">${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(product.price)}</span>` 
        : '';
    const displayPrice = product.sale_price || product.price;

    contentDiv.innerHTML = `
        <div class="product-detail-page">
            <div class="product-gallery">
                <div class="main-image-container">
                    <img id="main-product-image" src="${images[0]}" alt="${product.name}">
                </div>
                <div class="product-thumbnails">
                    ${images.map((img, index) => `
                        <div class="thumb-container ${index === 0 ? 'active' : ''}" data-image-src="${img}">
                            <img src="${img}" alt="Thumbnail ${index + 1}">
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="product-info">
                <h1 class="product-info-title">${product.name}</h1>
                <div class="availability">In Stock</div>
                <div class="price-box">
                    ${originalPriceHTML}
                    <span class="sale-price">${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(displayPrice)}</span>
                </div>
                <div class="product-actions">
                    <div class="quantity-selector">
                        <button class="quantity-minus">-</button>
                        <input type="number" value="1" min="1" readonly>
                        <button class="quantity-plus">+</button>
                    </div>
                    <button class="btn btn-primary add-to-cart-btn" style="flex-grow: 1;"
                        data-product-id="${product.id}"
                        data-product-name="${product.name}"
                        data-product-price="${displayPrice}"
                        data-product-image="${product.image || ''}">
                        Add to Cart
                    </button>
                </div>
            </div>

            <div class="product-specs-section">
                <nav class="tabs-nav">
                    <span class="tab-link active" data-tab="description">Description</span>
                    <span class="tab-link" data-tab="specification">Specification</span>
                </nav>
                <div id="description" class="tab-content active">
                    <p>${product.description || 'No description available.'}</p>
                </div>
                <div id="specification" class="tab-content">
                    <table class="spec-table">
                        <tbody>
                        ${product.specifications ? Object.entries(product.specifications).map(([key, value]) => `
                            <tr>
                                <td>${key}</td>
                                <td>${value}</td>
                            </tr>
                        `).join('') : '<tr><td>No specifications available.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const mainImage = document.getElementById('main-product-image');
    const thumbnails = document.querySelectorAll('.thumb-container');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            mainImage.src = thumb.dataset.imageSrc;
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.dataset.tab;
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
        });
    });
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
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/';
            return;
        }

        const cartItems = cart.getItems();
        if (cartItems.length === 0) {
            checkoutContent.innerHTML = '<h2>Your cart is empty.</h2><a href="/products.html">Go shopping</a>';
            return;
        }
        
        const subtotal = cart.getTotalPrice();
        const formattedSubtotal = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(subtotal);

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
        ].filter(Boolean).join(', ');

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
                cart.clearCart();
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
    } else if (path.endsWith('/search-results.html')) {
    const resultsGrid = document.getElementById('search-results-grid');
    const resultsTitle = document.getElementById('search-results-title');
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (!query) {
        resultsTitle.textContent = "Please enter a search term.";
        return;
    }

    resultsTitle.textContent = `Search Results for "${query}"`;
    resultsGrid.innerHTML = `<p>Searching...</p>`;

    const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    const products = await response.json();

    if (products.length > 0) {
        displayProducts(resultsGrid, products);
    } else {
        resultsGrid.innerHTML = `<h2>No products found matching your search.</h2>`;
    }
}
});