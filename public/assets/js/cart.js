const cart = (() => {
    let _cartItems = [];
    const LS_STORAGE_KEY = 'dre_rwrk_cart';
    let _supabaseClient;
    let _currentUser;

    function _getLocalStorageItems() {
        try {
            const storedCart = localStorage.getItem(LS_STORAGE_KEY);
            return storedCart ? JSON.parse(storedCart) : [];
        } catch (e) {
            console.error("Error parsing localStorage cart:", e);
            return [];
        }
    }

    function _saveLocalStorageCart(items) {
        localStorage.setItem(LS_STORAGE_KEY, JSON.stringify(items));
        _cartItems = items;
    }

    function _clearLocalStorageCart() {
        localStorage.removeItem(LS_STORAGE_KEY);
    }

    function _isNumericProductId(id) {
        return typeof id === 'number' && !isNaN(id) && id > 0;
    }

    async function _fetchSupabaseCart() {
        if (!_currentUser) return;

        try {
            const response = await fetch('/api/cart', {
                headers: { 'Authorization': `Bearer ${_currentUser.accessToken}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn("Supabase cart fetch failed, likely due to invalid session. Attempting logout.");
                    await _supabaseClient.auth.signOut();
                    _currentUser = null;
                    _cartItems = [];
                    _clearLocalStorageCart();
                    window.location.reload(); 
                    return;
                }
                throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            _cartItems = data;
        } catch (error) {
            console.error("Failed to fetch Supabase cart:", error);
            _cartItems = []; 
        }
    }

    async function _syncLocalStorageToSupabase() {
        if (!_currentUser) return;

        const localItems = _getLocalStorageItems();
        if (localItems.length === 0) {
            _clearLocalStorageCart();
            return;
        }

        console.log(`Syncing ${localItems.length} local cart items to Supabase for user ${_currentUser.id}`);

        for (const localItem of localItems) {
            if (!_isNumericProductId(localItem.id)) {
                console.log(`Skipping local-only item ${localItem.id} during Supabase sync.`);
                continue;
            }
            try {
                const response = await fetch('/api/cart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${_currentUser.accessToken}`
                    },
                    body: JSON.stringify({ productId: localItem.id, quantity: localItem.quantity })
                });

                if (!response.ok) {
                    console.error(`Failed to sync item ${localItem.id} to Supabase:`, await response.json());
                }
            } catch (error) {
                console.error(`Error during single item sync for product ${localItem.id} to Supabase:`, error);
            }
        }
        _clearLocalStorageCart();
        console.log('Local cart sync to Supabase complete.');
    }

    return {
        init: async (supabase, user, accessToken) => {
            _supabaseClient = supabase;
            _currentUser = user ? { id: user.id, accessToken: accessToken } : null;

            if (_currentUser) {
                console.log('Cart initializing for logged-in user:', _currentUser.id);
                await _syncLocalStorageToSupabase();
                await _fetchSupabaseCart();
            } else {
                console.log('Cart initializing for logged-out user.');
                _cartItems = _getLocalStorageItems();
            }
        },

        addItem: async (product, quantityToAdd = 1) => {
            if (!_isNumericProductId(product.id)) {
                const existingItem = _cartItems.find(item => item.id === product.id);
                if (existingItem) {
                    existingItem.quantity += quantityToAdd;
                } else {
                    _cartItems.push({ ...product, quantity: quantityToAdd });
                }
                _saveLocalStorageCart(_cartItems);
                showToast(`${product.name} added to cart!`);
                return;
            }

            if (_currentUser) {
                try {
                    const response = await fetch('/api/cart', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${_currentUser.accessToken}`
                        },
                        body: JSON.stringify({ productId: product.id, quantity: quantityToAdd })
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to add item to Supabase cart.');
                    }
                    await _fetchSupabaseCart();
                    showToast(`${product.name} added to cart!`);
                } catch (error) {
                    console.error("Error adding item to Supabase cart:", error);
                    showToast('Failed to add item to cart.', 'error');
                }
            } else {
                const existingItem = _cartItems.find(item => item.id === product.id);
                if (existingItem) {
                    existingItem.quantity += quantityToAdd;
                } else {
                    _cartItems.push({ ...product, quantity: quantityToAdd });
                }
                _saveLocalStorageCart(_cartItems);
                showToast(`${product.name} added to cart!`);
            }
        },

        updateItemQuantity: async (productId, quantity) => {
            // Check if it's a numeric product ID first, otherwise treat as string for local items
            const isNumeric = _isNumericProductId(productId);
            const itemId = isNumeric ? parseInt(productId, 10) : productId;

            if (!isNumeric) { // This is a virtual/package item (string ID), keep it local-only
                if (quantity <= 0) {
                    _cartItems = _cartItems.filter(item => item.id !== itemId);
                } else {
                    const item = _cartItems.find(item => item.id === itemId);
                    if (item) item.quantity = quantity;
                }
                _saveLocalStorageCart(_cartItems);
                return;
            }

            // Below is logic for numeric product IDs (Supabase synced)
            if (quantity <= 0) {
                return cart.removeItem(itemId);
            }

            if (_currentUser) {
                try {
                    const response = await fetch(`/api/cart/${itemId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${_currentUser.accessToken}`
                        },
                        body: JSON.stringify({ quantity })
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to update item quantity in Supabase cart.');
                    }
                    await _fetchSupabaseCart();
                } catch (error) {
                    console.error("Error updating item quantity in Supabase cart:", error);
                    showToast('Failed to update cart item quantity.', 'error');
                }
            } else {
                const item = _cartItems.find(item => item.id === itemId);
                if (item) {
                    item.quantity = quantity;
                }
                _saveLocalStorageCart(_cartItems);
            }
        },

        removeItem: async (productId) => {
            // Check if it's a numeric product ID first, otherwise treat as string for local items
            const isNumeric = _isNumericProductId(productId);
            const itemId = isNumeric ? parseInt(productId, 10) : productId;

            if (!isNumeric) { // This is a virtual/package item (string ID), keep it local-only
                _cartItems = _cartItems.filter(item => item.id !== itemId);
                _saveLocalStorageCart(_cartItems);
                return;
            }

            // Below is logic for numeric product IDs (Supabase synced)
            if (_currentUser) {
                try {
                    const response = await fetch(`/api/cart/${itemId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${_currentUser.accessToken}` }
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to remove item from Supabase cart.');
                    }
                    await _fetchSupabaseCart();
                } catch (error) {
                    console.error("Error removing item from Supabase cart:", error);
                    showToast('Failed to remove item from cart.', 'error');
                }
            } else {
                _cartItems = _cartItems.filter(item => item.id !== itemId);
                _saveLocalStorageCart(_cartItems);
            }
        },

        clearCart: async () => {
            if (_currentUser) {
                try {
                    const response = await fetch('/api/cart', {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${_currentUser.accessToken}` }
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to clear Supabase cart.');
                    }
                    await _fetchSupabaseCart();
                } catch (error) {
                    console.error("Error clearing Supabase cart:", error);
                    showToast('Failed to clear cart.', 'error');
                }
            } else {
                _cartItems = [];
                _saveLocalStorageCart(_cartItems);
            }
        },

        getItems: () => {
            return [..._cartItems];
        },

        getItemCount: () => {
            return _cartItems.reduce((total, item) => total + item.quantity, 0);
        },

        getTotalPrice: () => {
            return _cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        }
    };
})();