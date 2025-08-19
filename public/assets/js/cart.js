// This creates a global 'cart' object to be used by other scripts.
const cart = (() => {
    // Private variable to hold cart items.
    let cartItems = [];
    const STORAGE_KEY = 'dre_rwrk_cart';

    // Private function to load the cart from localStorage.
    function loadCart() {
        const storedCart = localStorage.getItem(STORAGE_KEY);
        if (storedCart) {
            cartItems = JSON.parse(storedCart);
        }
    }

    // Private function to save the cart to localStorage.
    function saveCart() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    }

    // Load the cart as soon as the module is initialized.
    loadCart();

    // The public API for our cart module.
    return {
        /**
         * Adds a product to the cart.
         * @param {object} product - The product object to add.
         */
        addItem: (product) => {
            const existingItem = cartItems.find(item => item.id === product.id);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cartItems.push({ ...product, quantity: 1 });
            }
            saveCart();
        },

        /**
         * Updates the quantity of a specific item in the cart.
         * @param {number} productId - The ID of the product to update.
         * @param {number} quantity - The new quantity.
         */
        updateItemQuantity: (productId, quantity) => {
            const item = cartItems.find(item => item.id === productId);
            if (item) {
                if (quantity > 0) {
                    item.quantity = quantity;
                } else {
                    // If quantity is 0 or less, remove the item.
                    cartItems = cartItems.filter(item => item.id !== productId);
                }
                saveCart();
            }
        },

        /**
         * Removes an item completely from the cart.
         * @param {number} productId - The ID of the product to remove.
         */
        removeItem: (productId) => {
            cartItems = cartItems.filter(item => item.id !== productId);
            saveCart();
        },

        /**
         * Returns all items currently in the cart.
         * @returns {Array} An array of cart item objects.
         */
        getItems: () => {
            return [...cartItems]; // Return a copy to prevent direct mutation.
        },

        /**
         * Calculates the total number of items in the cart (sum of quantities).
         * @returns {number} The total item count.
         */
        getItemCount: () => {
            return cartItems.reduce((total, item) => total + item.quantity, 0);
        },

        /**
         * Calculates the total price of all items in the cart.
         * @returns {number} The total price.
         */
        getTotalPrice: () => {
            return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        },

        /**
         * Clears all items from the cart.
         */
        clearCart: () => {
            cartItems = [];
            saveCart();
        }
    };
})();