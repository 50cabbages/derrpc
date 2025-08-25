let supabase;

async function initializeSupabase() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    supabase = window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey
    );
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
  }
}

async function fetchProducts(page = 1, limit = 10) {
  try {
    const response = await fetch(`/api/products?page=${page}&limit=${limit}`);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data; // Returns the full object { products: [...], ... }
  } catch (error) {
    console.error("Failed to fetch products from API:", error);
    return { products: [], totalPages: 0 }; // Return a default object shape on error
  }
}

async function fetchCategories() {
  try {
    const response = await fetch("/api/categories");
    if (!response.ok) throw new Error("Failed to fetch categories");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function fetchBrands() {
  try {
    const response = await fetch("/api/brands");
    if (!response.ok) throw new Error("Failed to fetch brands");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

function createProductCard(product) {
  const displayPrice =
    product.sale_price && product.sale_price > 0
      ? product.sale_price
      : product.price;
  const formattedDisplayPrice = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(displayPrice);

  let priceHTML;
  let saleTagHTML = "";
  if (product.sale_price && product.sale_price > 0) {
    const formattedOriginalPrice = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(product.price);
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

  const isInStock = product.stock > 0;
  const stockStatusHTML = isInStock
    ? `<div class="stock-status in-stock">In Stock</div>`
    : `<div class="stock-status out-of-stock">Out of Stock</div>`;

  const addToCartButtonHTML = isInStock
    ? `<button class="btn btn-primary add-to-cart-btn" 
                data-product-id="${product.id}"
                data-product-name="${product.name}"
                data-product-price="${displayPrice}"
                data-product-image="${product.image || ""}">
            Add to Cart
        </button>`
    : `<button class="btn btn-primary" disabled style="opacity: 0.5; cursor: not-allowed;">Out of Stock</button>`;

  return `
        <div class="product-card">
            ${saleTagHTML}
            <a href="product-detail.html?id=${
              product.id
            }" class="product-card-image">
                <img src="${
                  product.image ||
                  "https://via.placeholder.com/400x300.png?text=No+Image"
                }" alt="${product.name}">
            </a>
            <div class="product-card-content">
                <div>
                    <p class="product-card-category">${product.category}</p>
                    <h3 class="product-card-title">
                        <a href="product-detail.html?id=${product.id}">${
    product.name
  }</a>
                    </h3>
                    ${stockStatusHTML}
                </div>
                <div class="product-card-footer">
                    ${priceHTML}
                    ${addToCartButtonHTML}
                </div>
            </div>
        </div>
    `;
}

function displayProducts(container, products) {
  if (!container) return;
  container.innerHTML = "";

  if (products && products.length > 0) {
    const fragment = document.createDocumentFragment();
    products.forEach((product) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = createProductCard(product).trim();
      fragment.appendChild(tempDiv.firstChild);
    });
    container.appendChild(fragment);
  } else {
    container.innerHTML = "<h2>No products found.</h2>";
  }
}

// --- Functions for Cart, Auth, and UI Toggling (largely unchanged) ---

function updateCartUI() {
  renderCartItems();
  updateCartIcon();
}

function updateCartIcon() {
  const badge = document.getElementById("cart-count-badge");
  if (badge) {
    const count = cart.getItemCount();
    badge.textContent = count;
    badge.classList.toggle("visible", count > 0);
  }
}

function renderCartItems() {
  const cartList = document.getElementById("cart-items-list");
  const subtotalEl = document.getElementById("cart-subtotal");
  if (!cartList || !subtotalEl) return;
  const items = cart.getItems();
  if (items.length === 0) {
    cartList.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
  } else {
    cartList.innerHTML = items
      .map(
        (item) => `
            <div class="cart-item" data-product-id="${item.id}">
                <img src="${
                  item.image ||
                  "https://via.placeholder.com/100x100.png?text=No+Image"
                }" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <p class="cart-item-title">${item.name}</p>
                    <p class="cart-item-price">${new Intl.NumberFormat(
                      "en-PH",
                      { style: "currency", currency: "PHP" }
                    ).format(item.price)}</p>
                    <div class="cart-item-actions">
                        <div class="cart-item-quantity-selector">
                            <button class="quantity-decrease">-</button>
                            <input type="number" value="${
                              item.quantity
                            }" min="1" readonly>
                            <button class="quantity-increase">+</button>
                        </div>
                        <button class="cart-item-remove-btn">Remove</button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }
  const subtotal = cart.getTotalPrice();
  subtotalEl.textContent = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(subtotal);
}

function toggleCartPanel() {
  const panel = document.getElementById("cart-panel");
  const overlay = document.getElementById("cart-overlay");
  if (!panel || !overlay) return;
  panel.classList.toggle("is-open");
  const isVisible = overlay.classList.toggle("visible");
  if (isVisible) {
    overlay.classList.remove("hidden");
  } else {
    setTimeout(() => {
      if (!overlay.classList.contains("visible")) {
        overlay.classList.add("hidden");
      }
    }, 300);
  }
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const mainNavUl = document.querySelector('#main-nav-links ul');

    // Always clean up dynamic auth links from the mobile nav first
    mainNavUl?.querySelectorAll('.dynamic-auth-link').forEach(el => el.remove());

    if (user) {
        // --- LOGGED IN STATE ---

        // 1. Configure Desktop Header
        if (loginBtn && userInfo) {
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            const displayNameContainer = document.getElementById('user-display-name');
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
            displayNameContainer.textContent = fullName ? fullName.split(' ')[0] : user.email;
        }

        // 2. Inject Links into Mobile Slide-out Menu
        if (mainNavUl) {
            // Add a visual separator for clarity in the mobile menu
            const separatorLi = document.createElement('li');
            separatorLi.className = 'dynamic-auth-link';
            separatorLi.innerHTML = '<hr style="width: 80%; border-color: var(--border-color); margin: 1rem 0;">';
            mainNavUl.appendChild(separatorLi);

            const profileLi = document.createElement('li');
            profileLi.className = 'dynamic-auth-link';
            profileLi.innerHTML = `<a href="/profile.html">My Profile</a>`;
            mainNavUl.appendChild(profileLi);

            const logoutLi = document.createElement('li');
            logoutLi.className = 'dynamic-auth-link';
            logoutLi.innerHTML = `<a href="#" id="mobile-logout-btn">Logout</a>`;
            mainNavUl.appendChild(logoutLi);
        }

    } else {
        // --- LOGGED OUT STATE ---

        // 1. Configure Desktop Header
        if (loginBtn && userInfo) {
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
        }

        // 2. Inject Login Link into Mobile Slide-out Menu
        if (mainNavUl) {
            const separatorLi = document.createElement('li');
            separatorLi.className = 'dynamic-auth-link';
            separatorLi.innerHTML = '<hr style="width: 80%; border-color: var(--border-color); margin: 1rem 0;">';
            mainNavUl.appendChild(separatorLi);

            const loginLi = document.createElement('li');
            loginLi.className = 'dynamic-auth-link';
            loginLi.innerHTML = `<a href="/api/auth/google">Login</a>`;
            mainNavUl.appendChild(loginLi);
        }
    }
}

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Error during client-side logout:", error);
}

// --- Main DOMContentLoaded event listener ---
document.addEventListener("DOMContentLoaded", async () => {
  await initializeSupabase();

  const loadComponent = (url, placeholderId) => {
    return fetch(url)
      .then((response) => response.text())
      .then((data) => {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) placeholder.innerHTML = data;
      })
      .catch((error) => console.error(`Failed to load ${url}:`, error));
  };

  await Promise.all([
    loadComponent("_header.html", "header-placeholder"),
    loadComponent("_cart-panel.html", "cart-panel-placeholder"),
  ]);

  // Setup event listeners for header, cart, etc. (unchanged)
  document
    .getElementById("header-search-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const searchTerm = e.target.elements.q.value;
      if (searchTerm) {
        window.location.href = `/search-results.html?q=${encodeURIComponent(
          searchTerm
        )}`;
      }
    });

  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mainNav = document.getElementById("main-nav-links");
  const menuOverlay = document.getElementById("mobile-menu-overlay");

  // if (mainNav) document.body.appendChild(mainNav);
  // if (menuOverlay) document.body.appendChild(menuOverlay);

  const toggleMobileMenu = () => {
    const isOpen = mainNav.classList.toggle("is-open");
    menuOverlay.classList.toggle("is-open");
    document.body.classList.toggle("mobile-menu-open", isOpen);
  };

  mobileMenuBtn?.addEventListener("click", toggleMobileMenu);
  menuOverlay?.addEventListener("click", toggleMobileMenu);
  document
    .getElementById("cart-btn")
    ?.addEventListener("click", toggleCartPanel);
  document
    .getElementById("close-cart-btn")
    ?.addEventListener("click", toggleCartPanel);
  document
    .getElementById("cart-overlay")
    ?.addEventListener("click", toggleCartPanel);
  document
    .getElementById("logout-btn")
    ?.addEventListener("click", handleLogout);

  if (supabase) {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      updateAuthUI(session?.user || null);
      // Admin redirect logic (simplified for clarity, original is fine)
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (
          data &&
          data.role === "admin" &&
          !window.location.pathname.startsWith("/admin")
        ) {
          window.location.replace("/admin.html");
        }
      }
    });
  }

  updateCartUI();
  loadComponent("_footer.html", "footer-placeholder");

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (target.id === 'mobile-logout-btn') {
        event.preventDefault();
        handleLogout();
    }

    if (target.classList.contains("add-to-cart-btn")) {
      const product = {
        id: parseInt(target.dataset.productId),
        name: target.dataset.productName,
        price: parseFloat(target.dataset.productPrice),
        image: target.dataset.productImage,
      };
      cart.addItem(product);
      updateCartUI();
      const panel = document.getElementById("cart-panel");
      if (panel && !panel.classList.contains("is-open")) {
        toggleCartPanel();
      }
    }
    const cartItem = target.closest(".cart-item");
    if (cartItem) {
      const productId = parseInt(cartItem.dataset.productId);
      const currentQuantity =
        cart.getItems().find((i) => i.id === productId)?.quantity || 0;
      if (target.classList.contains("quantity-increase")) {
        cart.updateItemQuantity(productId, currentQuantity + 1);
      } else if (target.classList.contains("quantity-decrease")) {
        cart.updateItemQuantity(productId, currentQuantity - 1);
      } else if (target.classList.contains("cart-item-remove-btn")) {
        cart.removeItem(productId);
      }
      updateCartUI();
    }
  });

  const path = window.location.pathname;

  // --- Page-Specific Logic ---

  if (path.endsWith("/") || path.endsWith("/index.html")) {
const [productsData, categories, brands] = await Promise.all([ fetchProducts(1, 4), fetchCategories(), fetchBrands() ]);
displayProducts(document.getElementById('featured-product-grid'), productsData.products);

    const categoryGrid = document.getElementById("category-grid");
    if (categoryGrid) {
      const categoryList = document.createElement("div");
      categoryList.className = "category-list";
      const generateCategoryHTML = (cat) =>
        `<a href="products.html?category=${encodeURIComponent(
          cat.name
        )}" class="category-card"><div class="icon-container"><img src="${
          cat.image_url || ""
        }" alt="${cat.name}"></div><h3>${cat.name}</h3></a>`;
      const originalHTML = categories.map(generateCategoryHTML).join("");
      categoryList.innerHTML = originalHTML + originalHTML;
      categoryGrid.innerHTML = "";
      categoryGrid.appendChild(categoryList);
    }

    const brandLogosContainer = document.getElementById(
      "brand-logos-container"
    );
    if (brandLogosContainer) {
      // Update brand links to point to the filtered product page
      const generateBrandHTML = (brand) =>
        `<a href="products.html?brand=${brand.id}" class="brand-card"><img src="${brand.logo_url}" alt="${brand.name}"></a>`;
      const originalHTML = brands.map(generateBrandHTML).join("");
      brandLogosContainer.innerHTML =
        originalHTML + originalHTML + (brands.length < 8 ? originalHTML : "");
    }
  } else if (path.endsWith('/products.html')) {
    const productsGrid = document.getElementById('products-grid');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const brandFilterSelect = document.getElementById('brand-filter');
    const sortBySelect = document.getElementById('sort-by');
    const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const paginationControls = document.getElementById('pagination-controls');

    const [categories, brands] = await Promise.all([fetchCategories(), fetchBrands()]);

    if (brandFilterSelect) {
        brandFilterSelect.innerHTML = '<option value="">All Brands</option>';
        brandFilterSelect.innerHTML += brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }
    
    if (categoryFiltersContainer) {
        const allProductsLink = '<li><a href="#" data-category="">All Products</a></li>';
        const categoryLinks = categories.map(cat => `<li><a href="#" data-category="${cat.name}">${cat.name}</a></li>`).join('');
        categoryFiltersContainer.innerHTML = allProductsLink + categoryLinks;
    }

    toggleFiltersBtn?.addEventListener('click', () => {
        categoryFiltersContainer?.classList.toggle('is-open');
    });

    const updateURL = (params) => {
        const newUrl = new URL(window.location);
        Object.keys(params).forEach(key => {
            if (params[key]) {
                newUrl.searchParams.set(key, params[key]);
            } else {
                newUrl.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', newUrl);
    };

    const fetchAndDisplayProducts = async () => {
        productsGrid.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || '1';
        const category = params.get('category') || '';
        const brand_id = params.get('brand') || '';
        const sort = params.get('sort') || 'default';
        
        const apiUrl = `/api/products?page=${page}&limit=10&category=${category}&brand_id=${brand_id}&sort=${sort}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        displayProducts(productsGrid, data.products);
        renderSmartPagination(data.totalPages, data.currentPage);
        
        document.querySelectorAll('#category-filters a').forEach(a => a.classList.remove('active'));
        document.querySelector(`#category-filters a[data-category="${category}"]`)?.classList.add('active');
        brandFilterSelect.value = brand_id;
        sortBySelect.value = sort;
    };

    const renderSmartPagination = (totalPages, currentPage) => {
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        const createPageLink = (page, text = page) => {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = text;
            pageLink.dataset.page = page;
            if (page === currentPage) {
                pageLink.classList.add('current');
            }
            return pageLink;
        };

        const createEllipsis = () => {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            return ellipsis;
        };
        
        // Previous page link
        if (currentPage > 1) paginationControls.appendChild(createPageLink(currentPage - 1, '<'));
        
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                paginationControls.appendChild(createPageLink(i));
            }
        } else {
            paginationControls.appendChild(createPageLink(1));
            if (currentPage > 3) {
                paginationControls.appendChild(createEllipsis());
            }
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                end = 4;
            }
            if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            for (let i = start; i <= end; i++) {
                paginationControls.appendChild(createPageLink(i));
            }
            if (currentPage < totalPages - 2) {
                paginationControls.appendChild(createEllipsis());
            }
            paginationControls.appendChild(createPageLink(totalPages));
        }
        
        // Next page link
        if (currentPage < totalPages) paginationControls.appendChild(createPageLink(currentPage + 1, '>'));
    };
    
    const handleFilterChange = (resetPage = true) => {
        const params = new URLSearchParams(window.location.search);
        const newParams = {
            page: resetPage ? '1' : (params.get('page') || '1'),
            category: params.get('category'),
            brand: brandFilterSelect.value,
            sort: sortBySelect.value,
        };
        updateURL(newParams);
        fetchAndDisplayProducts();
    };

    // Initial Load - Reads state from URL
    fetchAndDisplayProducts();

    // Event Listeners
    brandFilterSelect.addEventListener('change', () => handleFilterChange(true));
    sortBySelect.addEventListener('change', () => handleFilterChange(true));

    categoryFiltersContainer.addEventListener('click', e => {
        e.preventDefault();
        if (e.target.tagName === 'A') {
            const params = new URLSearchParams(window.location.search);
            const newParams = {
                page: '1',
                category: e.target.dataset.category,
                brand: params.get('brand'),
                sort: params.get('sort'),
            };
            updateURL(newParams);
            fetchAndDisplayProducts();
        }
    });

    paginationControls.addEventListener('click', e => {
        e.preventDefault();
        if (e.target.tagName === 'A') {
            const params = new URLSearchParams(window.location.search);
            const newParams = {
                page: e.target.dataset.page,
                category: params.get('category'),
                brand: params.get('brand'),
                sort: params.get('sort'),
            };
            updateURL(newParams);
            fetchAndDisplayProducts();
        }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', fetchAndDisplayProducts);
}
 else if (path.endsWith('/product-detail.html')) {
    const contentDiv = document.getElementById('product-detail-content');
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get('id'));

    if (!productId) {
        contentDiv.innerHTML = '<h2>Product ID not found.</h2>';
        return;
    }

    // Fetch the main product
    const { data: product, error } = await supabase
        .from('products')
        .select('*, brands(name)') // Also fetch brand name
        .eq('id', productId)
        .single();

    if (error || !product) {
        contentDiv.innerHTML = '<h2>Product not found.</h2>';
        return;
    }
    
    // --- NEW LOGIC: Fetch related products ---
    const relatedProductsGrid = document.getElementById('related-products-grid');
    const relatedProductsTitle = document.getElementById('related-products-title');
    if (product.category) {
        relatedProductsTitle.textContent = `More in ${product.category}`;
        const { data: relatedProducts, error: relatedError } = await supabase
            .from('products')
            .select('*, brands(name)')
            .eq('category', product.category)
            .neq('id', product.id) // Exclude the current product itself
            .limit(3); // Get up to 4 other products

        if (relatedProducts && relatedProducts.length > 0) {
            displayProducts(relatedProductsGrid, relatedProducts);
        } else {
            document.querySelector('.related-products').style.display = 'none'; // Hide section if no related items found
        }
    } else {
        document.querySelector('.related-products').style.display = 'none';
    }
    // --- END OF NEW LOGIC ---

    document.title = `${product.name} - DRE Computer Center`;

    const images = [product.image, product.image_2, product.image_3, product.image_4].filter(Boolean);
    const displayPrice = product.sale_price || product.price;
    const isInStock = product.stock > 0;
    const originalPriceHTML = product.sale_price ? `<span class="original-price">${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(product.price)}</span>` : '';
    const stockStatusHTML = isInStock ? `<div class="stock-status in-stock">In Stock</div>` : `<div class="stock-status out-of-stock">Out of Stock</div>`;
    
    const actionsHTML = isInStock ? `
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
    ` : `<button class="btn btn-primary" disabled style="opacity: 0.5; cursor: not-allowed; width: 100%;">Out of Stock</button>`;

    contentDiv.innerHTML = `
        <div class="product-detail-page">
            <div class="product-gallery">
                <div class="main-image-container">
                    <img id="main-product-image" src="${images[0] || 'https://via.placeholder.com/600x400.png?text=No+Image'}" alt="${product.name}">
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
                ${product.brands && product.brands.logo_url ? `<div class="product-brand"><img src="${product.brands.logo_url}" alt="${product.brands.name}"></div>` : ''}
                <h1 class="product-info-title">${product.name}</h1>
                ${stockStatusHTML}
                <div class="price-box">
                    ${originalPriceHTML}
                    <span class="sale-price">${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(displayPrice)}</span>
                </div>
                <div class="product-actions">
                    ${actionsHTML}
                </div>
            </div>
            <div class="product-specs-section">
                <nav class="tabs-nav">
                    <span class="tab-link active" data-tab="description">Description</span>
                    <span class="tab-link" data-tab="specification">Specification</span>
                </nav>
                <div id="description" class="tab-content active"><p>${product.description || 'No description available.'}</p></div>
                <div id="specification" class="tab-content">
                    <table class="spec-table"><tbody>
                        ${product.specifications ? Object.entries(product.specifications).map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`).join('') : '<tr><td colspan="2">No specifications available.</td></tr>'}
                    </tbody></table>
                </div>
            </div>
        </div>
    `;
    
    // Re-bind all event listeners for the new content
    const mainImage = document.getElementById('main-product-image');
    document.querySelectorAll('.thumb-container').forEach(thumb => {
        thumb.addEventListener('click', () => {
            mainImage.src = thumb.dataset.imageSrc;
            document.querySelectorAll('.thumb-container').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.dataset.tab;
            document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
        });
    });
    const quantityInput = contentDiv.querySelector('.quantity-selector input');
    contentDiv.querySelector('.quantity-minus')?.addEventListener('click', () => {
        let currentVal = parseInt(quantityInput.value);
        if (currentVal > 1) quantityInput.value = currentVal - 1;
    });
    contentDiv.querySelector('.quantity-plus')?.addEventListener('click', () => {
        let currentVal = parseInt(quantityInput.value);
        quantityInput.value = currentVal + 1;
    });
} else if (path.endsWith("/profile.html")) {
    const form = document.getElementById("profile-form");
    const feedbackEl = document.getElementById("form-feedback");
    const editBtn = document.getElementById("edit-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    let currentProfileData = {};

    const populateProfileData = (profile) => {
      currentProfileData = profile;
      for (const key in profile) {
        const viewEl = document.querySelector(
          `.profile-data-value[data-field="${key}"]`
        );
        if (viewEl) viewEl.textContent = profile[key] || "Not set";
        const inputEl = form.elements[key];
        if (inputEl) inputEl.value = profile[key] || "";
      }
    };

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/";
      return;
    }
    const accessToken = session.access_token;
    const response = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      const profile = await response.json();
      populateProfileData(profile);
    } else {
      console.error("Failed to fetch profile, redirecting.");
      window.location.href = "/";
    }

    const renderOrderHistory = (orders) => {
      const container = document.getElementById("order-history-container");
      if (!orders || orders.length === 0) {
        container.innerHTML = "<p>You have no past orders.</p>";
        return;
      }

      container.innerHTML = orders
        .map(
          (order) => `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <h4>Order #${order.id}</h4>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                Placed on ${new Date(
                                  order.created_at
                                ).toLocaleDateString()}
                            </p>
                        </div>
                        <span class="order-status">${order.status}</span>
                    </div>
                    <div class="order-body">
                        ${order.order_items
                          .map(
                            (item) => `
                            <div class="order-item">
                                <img src="${
                                  item.products.image ||
                                  "https://via.placeholder.com/100x100.png?text=No+Image"
                                }" alt="${
                              item.products.name
                            }" class="order-item-image">
                                <div class="order-item-details">
                                    <p>${item.products.name}</p>
                                    <p style="font-size: 0.9rem; color: var(--text-secondary);">
                                        ${
                                          item.quantity
                                        } x ${new Intl.NumberFormat("en-PH", {
                              style: "currency",
                              currency: "PHP",
                            }).format(item.price_at_purchase)}
                                    </p>
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="order-footer">
                        Total: ${new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                        }).format(order.total_price)}
                    </div>
                </div>
            `
        )
        .join("");
    };

    const orderResponse = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (orderResponse.ok) {
      const orders = await orderResponse.json();
      renderOrderHistory(orders);
    } else {
      document.getElementById("order-history-container").innerHTML =
        "<p>Could not load order history.</p>";
    }

    editBtn.addEventListener("click", () => {
      form.classList.remove("view-mode");
      form.classList.add("edit-mode");
    });

    cancelBtn.addEventListener("click", () => {
      populateProfileData(currentProfileData);
      form.classList.remove("edit-mode");
      form.classList.add("view-mode");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const profileData = Object.fromEntries(formData.entries());

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const updateResponse = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        populateProfileData(result.profile);
        form.classList.remove("edit-mode");
        form.classList.add("view-mode");
        feedbackEl.textContent = "Profile updated successfully!";
        feedbackEl.className = "form-feedback success";
      } else {
        feedbackEl.textContent = "Failed to update profile. Please try again.";
        feedbackEl.className = "form-feedback error";
      }
      setTimeout(() => {
        feedbackEl.textContent = "";
      }, 3000);
    });
  } else if (path.endsWith("/checkout.html")) {
    const checkoutContent = document.getElementById("checkout-content");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/";
      return;
    }

    const cartItems = cart.getItems();
    if (cartItems.length === 0) {
      checkoutContent.innerHTML =
        '<h2>Your cart is empty.</h2><a href="/products.html">Go shopping</a>';
      return;
    }

    const subtotal = cart.getTotalPrice();
    const formattedSubtotal = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(subtotal);

    const response = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const profile = await response.json();

    const address = [
      profile.address_line1,
      profile.address_line2,
      profile.city,
      profile.province,
      profile.postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    checkoutContent.innerHTML = `
            <h3>Order Summary</h3>
            <ul>
                ${cartItems
                  .map(
                    (item) =>
                      `<li>${item.name} (x${
                        item.quantity
                      }) - ${new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      }).format(item.price * item.quantity)}</li>`
                  )
                  .join("")}
            </ul>
            <hr style="margin: 1rem 0;">
            <p><strong>Total: ${formattedSubtotal}</strong></p>
            
            <h3>Shipping To:</h3>
            <p>${profile.full_name}</p>
            <p>${
              address ||
              'No address set. Please <a href="/profile.html">update your profile</a>.'
            }</p>
            <br>
            <button id="place-order-btn" class="btn btn-primary" ${
              !address ? "disabled" : ""
            }>Place Order</button>
        `;

    document
      .getElementById("place-order-btn")
      ?.addEventListener("click", async () => {
        const btn = document.getElementById("place-order-btn");
        btn.disabled = true;
        btn.textContent = "Processing...";

        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ cartItems: cart.getItems() }),
        });

        if (orderResponse.ok) {
          const result = await orderResponse.json();
          cart.clearCart();
          updateCartUI();
          window.location.href = `/order-success.html?orderId=${result.order.id}`;
        } else {
          alert("Failed to place order. Please try again.");
          btn.disabled = false;
          btn.textContent = "Place Order";
        }
      });
  } else if (path.endsWith("/order-success.html")) {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    if (orderId) {
      document.getElementById(
        "order-id-display"
      ).textContent = `Your Order ID is #${orderId}.`;
    }
  } else if (path.endsWith("/search-results.html")) {
    const resultsGrid = document.getElementById("search-results-grid");
    const resultsTitle = document.getElementById("search-results-title");
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");

    if (!query) {
      resultsTitle.textContent = "Please enter a search term.";
      return;
    }

    resultsTitle.textContent = `Search Results for "${query}"`;
    resultsGrid.innerHTML = `<p>Searching...</p>`;

    const response = await fetch(
      `/api/products/search?q=${encodeURIComponent(query)}`
    );
    const products = await response.json();

    if (products.length > 0) {
      displayProducts(resultsGrid, products);
    } else {
      resultsGrid.innerHTML = `<h2>No products found matching your search.</h2>`;
    }
  } else if (path.endsWith("/packages.html")) {
    const packagesContainer = document.getElementById("packages-container");
    const modalOverlay = document.getElementById("package-modal-overlay");
    const modalContent = document.getElementById("package-modal-content");

    const response = await fetch("/api/packages");
    const packages = await response.json();

    const packagesByCategory = packages.reduce((acc, pkg) => {
      const category = pkg.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(pkg);
      return acc;
    }, {});

    packagesContainer.innerHTML = ""; // Clear spinner
    const categoryOrder = [
      "ESSENTIAL BUILDS",
      "PERFORMANCE BUILDS",
      "ULTIMATE BUILDS",
    ];

    if (packages.length > 0) {
      categoryOrder.forEach((category) => {
        if (packagesByCategory[category]) {
          const pkgs = packagesByCategory[category];
          const section = document.createElement("section");
          section.className = "package-section";
          section.innerHTML = `
                    <h2 class="package-section-title">${category}</h2>
                    <div class="product-grid">
                        ${pkgs
                          .map(
                            (pkg) => `
                            <div class="package-card" data-package-id="${pkg.id}">
                                <img src="${pkg.image_url}" alt="${pkg.name}">
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                `;
          packagesContainer.appendChild(section);
        }
      });
    } else {
      packagesContainer.innerHTML =
        "<h2>No PC packages are available at this time.</h2>";
    }

const openModal = (pkg) => {
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>${pkg.name}</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <img src="${pkg.image_url}" alt="${pkg.name}" style="width: 100%; margin-bottom: 1.5rem; border-radius: 8px;">
            
            <h4>Description</h4>
            <p style="color: var(--text-secondary);">${pkg.description || 'No details available.'}</p>
            
            <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; justify-content: space-between; align-items: center;">
                <div class="price-box">
                    <span style="font-size: 1.5rem; font-weight: 700;">
                        ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(pkg.price_complete)}
                    </span>
                    <span style="font-size: 1rem; color: var(--text-secondary); display: block;">Complete Set</span>
                </div>
                <div>
                    <a href="/package-detail.html?id=${pkg.id}" class="btn btn-outline" style="margin-right: 0.5rem;">View Components</a>
                    <button class="btn btn-primary add-package-to-cart-btn" data-package-id="${pkg.id}">Add to Cart</button>
                </div>
            </div>
        </div>
    `;
    modalOverlay.style.display = 'flex';
};

    const closeModal = () => {
      modalOverlay.style.display = "none";
    };

    // THIS IS THE CORRECTED EVENT LISTENER ATTACHMENT
    packagesContainer.addEventListener("click", (e) => {
      const card = e.target.closest(".package-card");
      if (card) {
        const packageId = Number(card.dataset.packageId);
        const selectedPackage = packages.find((p) => p.id === packageId);
        if (selectedPackage) {
          openModal(selectedPackage);
        }
      }
    });

    modalOverlay.addEventListener("click", (e) => {
      if (
        e.target === modalOverlay ||
        e.target.classList.contains("modal-close-btn")
      ) {
        closeModal();
      }
      if (e.target.classList.contains("add-package-to-cart-btn")) {
        const packageId = Number(e.target.dataset.packageId);
        const selectedPackage = packages.find((p) => p.id === packageId);
        if (selectedPackage) {
          const packageAsCartItem = {
            id: `pkg-${selectedPackage.id}`,
            name: `${selectedPackage.name} (Package)`,
            price: selectedPackage.price_complete,
            image: selectedPackage.image_url,
          };
          cart.addItem(packageAsCartItem);
          updateCartUI();
          closeModal();
          toggleCartPanel();
        }
      }
    });
  } else if (path.endsWith('/package-detail.html')) {
    const contentDiv = document.getElementById('package-detail-content');
    const params = new URLSearchParams(window.location.search);
    const packageId = params.get('id');

    if (!packageId) {
        contentDiv.innerHTML = '<h2>Package ID not found.</h2>';
        return;
    }

    const response = await fetch('/api/packages');
    const packages = await response.json();
    const pkg = packages.find(p => p.id == packageId);

    if (!pkg) {
        contentDiv.innerHTML = '<h2>Package not found.</h2>';
        return;
    }

    document.title = `${pkg.name} - DRE Computer Center`;

    // --- NEW, ROBUST PARSER ---
    let mainDescriptionHTML = '';
    let componentsHTML = '';
    const descriptionLines = (pkg.description || '').split('\n').filter(line => line.trim() !== '');
    
    // Check if the first line looks like a component list or a simple description
    if (descriptionLines.length > 0 && descriptionLines[0].includes(':')) {
        // It's a component list
        componentsHTML = descriptionLines.map(line => {
            const parts = line.split(':');
            const label = parts[0] ? parts[0].trim() : '';
            const value = parts[1] ? parts[1].trim() : '';
            return `
                <li>
                    <span class="component-label">${label}</span>
                    <span class="component-value">${value}</span>
                </li>`;
        }).join('');
    } else {
        // It's a simple description paragraph
        mainDescriptionHTML = `<p>${pkg.description || 'No details available.'}</p>`;
    }

    contentDiv.innerHTML = `
        <div class="package-detail-layout">
            <div class="package-image-container">
                <img src="${pkg.image_url}" alt="${pkg.name}">
            </div>
            <div class="package-info">
                <h1>${pkg.name}</h1>
                <div class="price-box" style="margin-bottom: 2rem;">
                    <span style="font-size: 2rem; font-weight: 700; color: var(--primary-blue);">
                        ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(pkg.price_complete)}
                    </span>
                    <span style="display: block; color: var(--text-secondary);">Complete Set Price</span>
                </div>
                
                ${mainDescriptionHTML}

                <button class="btn btn-primary add-package-to-cart-btn" data-package-id="${pkg.id}" style="width: 100%; margin-top: 1rem;">Add Complete Set to Cart</button>
                
                ${componentsHTML ? '<h4 style="margin-top: 2rem;">Components</h4>' : ''}
                <ul class="component-list">
                    ${componentsHTML}
                </ul>
            </div>
        </div>
    `;

    contentDiv.addEventListener('click', e => {
        if (e.target.classList.contains('add-package-to-cart-btn')) {
            const packageAsCartItem = {
                id: `pkg-${pkg.id}`,
                name: `${pkg.name} (Package)`,
                price: pkg.price_complete,
                image: pkg.image_url,
            };
            cart.addItem(packageAsCartItem);
            updateCartUI();
            toggleCartPanel();
        }
    });
}
});
