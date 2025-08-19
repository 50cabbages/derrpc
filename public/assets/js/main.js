// public/assets/js/main.js

// --- SUPABASE CLIENT-SIDE INITIALIZATION ---
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

// --- API HELPER FUNCTIONS ---

async function fetchProducts(category = "") {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    let products = await response.json();
    if (category) {
      products = products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }
    return products;
  } catch (error) {
    console.error("Failed to fetch products from API:", error);
    return [];
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

async function fetchProductById(id) {
  const products = await fetchProducts();
  return products.find((p) => p.id === id);
}

// --- RENDERING FUNCTIONS ---

function createProductCard(product) {
  const formattedPrice = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(product.price);
  return `
        <div class="product-card">
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
                </div>
                <div class="product-card-footer">
                    <span class="product-card-price">${formattedPrice}</span>
                    <button class="btn btn-primary add-to-cart-btn" 
                            data-product-id="${product.id}"
                            data-product-name="${product.name}"
                            data-product-price="${product.price}"
                            data-product-image="${product.image || ""}">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderProductDetail(product) {
  const formattedPrice = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(product.price);
  return `
        <div class="product-detail-layout">
            <div class="product-image-gallery">
                <img src="${
                  product.image ||
                  "https://via.placeholder.com/600x400.png?text=No+Image"
                }" alt="${product.name}">
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
                    {/* THE FIX for product detail page button */}
                    <button class="btn btn-primary add-to-cart-btn" style="flex-grow: 1;"
                            data-product-id="${product.id}"
                            data-product-name="${product.name}"
                            data-product-price="${product.price}"
                            data-product-image="${product.image || ""}">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

function displayProducts(container, products) {
  if (!container) return;
  container.innerHTML =
    products.length > 0
      ? products.map(createProductCard).join("")
      : "<h2>No products found for this category.</h2>";
}

// --- CART UI FUNCTIONS ---

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

// --- AUTHENTICATION UI & ACTIONS ---

function updateAuthUI(user) {
  const loginBtn = document.getElementById("login-btn");
  const userInfo = document.getElementById("user-info");
  if (loginBtn && userInfo) {
    if (user) {
      loginBtn.classList.add("hidden");
      userInfo.classList.remove("hidden");
      const displayNameContainer = document.getElementById("user-display-name");
      const fullName =
        user.user_metadata?.full_name || user.user_metadata?.name;
      displayNameContainer.textContent = fullName
        ? fullName.split(" ")[0]
        : user.email;
    } else {
      loginBtn.classList.remove("hidden");
      userInfo.classList.add("hidden");
    }
  }
}

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Error during client-side logout:", error);
}

// --- MAIN INITIALIZATION LOGIC ---
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

  // --- INITIAL LOAD & SETUP ---

  // FIX #2: Use Promise.all to wait for critical UI to load before attaching listeners.
  await Promise.all([
    loadComponent("_header.html", "header-placeholder"),
    loadComponent("_cart-panel.html", "cart-panel-placeholder"),
  ]);

  // Now it's 100% safe to attach listeners and render initial state.
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
    supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthUI(session?.user || null);
    });
  }

  // Render the initial state of the cart
  updateCartUI();

  // Load non-critical components
  loadComponent("_footer.html", "footer-placeholder");

  // --- EVENT DELEGATION FOR DYNAMIC CONTENT (Buttons created after initial load) ---

  document.body.addEventListener("click", (event) => {
    const target = event.target;

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

  // --- PAGE-SPECIFIC LOGIC ---
  const path = window.location.pathname;
  if (path.endsWith("/") || path.endsWith("/index.html")) {
    const [products, categories, brands] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchBrands(),
    ]);
    displayProducts(
      document.getElementById("featured-product-grid"),
      products.slice(0, 4)
    );
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
      const generateBrandHTML = (brand) =>
        `<div class="brand-card"><img src="${brand.logo_url}" alt="${brand.name}"></div>`;
      const originalHTML = brands.map(generateBrandHTML).join("");
      brandLogosContainer.innerHTML =
        originalHTML + originalHTML + (brands.length < 8 ? originalHTML : "");
    }
  } else if (path.endsWith("/products.html")) {
    const productsGrid = document.getElementById("products-grid");
    const categoryFiltersContainer =
      document.getElementById("category-filters");
    const categories = await fetchCategories();
    if (categoryFiltersContainer) {
      const allProductsLink =
        '<li><a href="products.html" data-category="All Products">All Products</a></li>';
      const categoryLinks = categories
        .map(
          (cat) =>
            `<li><a href="products.html?category=${encodeURIComponent(
              cat.name
            )}" data-category="${cat.name}">${cat.name}</a></li>`
        )
        .join("");
      categoryFiltersContainer.innerHTML = allProductsLink + categoryLinks;
    }
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    document
      .querySelectorAll("#category-filters a")
      .forEach((a) => a.classList.remove("active"));
    const activeLink = category
      ? document.querySelector(
          `#category-filters a[data-category="${category}"]`
        )
      : document.querySelector(
          '#category-filters a[data-category="All Products"]'
        );
    if (activeLink) activeLink.classList.add("active");
    const products = await fetchProducts(category);
    displayProducts(productsGrid, products);
  } else if (path.endsWith("/product-detail.html")) {
    const contentDiv = document.getElementById("product-detail-content");
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get("id"));
    if (contentDiv && productId) {
      const product = await fetchProductById(productId);
      if (product) {
        document.title = `${product.name} - DRE Computer Center`;
        contentDiv.innerHTML = renderProductDetail(product);
      } else {
        contentDiv.innerHTML = "<h2>Product not found</h2>";
      }
    }
  }
});
