const cart = (() => {
    let _cartItems = [];
    const LS_STORAGE_KEY = 'dre_rwrk_cart';
    let _supabaseClient;
    let _currentUser = null;

    async function _getAuthHeaders() {
        const { data: { session } } = await _supabaseClient.auth.getSession();
        if (!session) return null;
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        };
    }

    return {
        init: async (supabase, user) => {
            _supabaseClient = supabase;
            _currentUser = user;

            if (_currentUser) {
                // User is logged in. Sync any items from their previous logged-out session.
                const localItems = JSON.parse(localStorage.getItem(LS_STORAGE_KEY) || '[]');
                
                // THE FIX: Immediately clear local storage to prevent it from being read again during refresh.
                // The `localItems` variable now holds the state we need to sync.
                localStorage.removeItem(LS_STORAGE_KEY);

                if (localItems.length > 0) {
                    const headers = await _getAuthHeaders();
                    if (headers) {
                        for (const item of localItems) {
                            // The API handles both real and virtual items with a single POST
                            await fetch('/api/cart', {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({ item })
                            });
                        }
                    }
                }
            }
        },

        refresh: async () => {
            if (_currentUser) {
                const headers = await _getAuthHeaders();
                if (!headers) { _cartItems = []; return; }
                try {
                    const response = await fetch('/api/cart', { headers });
                    _cartItems = response.ok ? await response.json() : [];
                } catch (e) {
                    console.error("Cart refresh failed", e);
                    _cartItems = [];
                }
            } else {
                _cartItems = JSON.parse(localStorage.getItem(LS_STORAGE_KEY) || '[]');
            }
        },
        
        handleLogout: () => {
            localStorage.setItem(LS_STORAGE_KEY, JSON.stringify(_cartItems));
            _currentUser = null;
        },

        addItem: async (product, quantityToAdd = 1) => {
            const item = { ...product, quantity: quantityToAdd };
            if (_currentUser) {
                const headers = await _getAuthHeaders();
                if (!headers) return;
                await fetch('/api/cart', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ item })
                });
            } else {
                const existingItem = _cartItems.find(i => i.id === item.id);
                if (existingItem) {
                    existingItem.quantity += quantityToAdd;
                } else {
                    _cartItems.push(item);
                }
                localStorage.setItem(LS_STORAGE_KEY, JSON.stringify(_cartItems));
            }
        },

        updateItemQuantity: async (itemId, newQuantity) => {
            if (newQuantity <= 0) {
                return cart.removeItem(itemId);
            }
            if (_currentUser) {
                const headers = await _getAuthHeaders();
                if (!headers) return;
                await fetch(`/api/cart/${itemId}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ quantity: newQuantity })
                });
            } else {
                const item = _cartItems.find(i => i.id === itemId);
                if (item) item.quantity = newQuantity;
                localStorage.setItem(LS_STORAGE_KEY, JSON.stringify(_cartItems));
            }
        },

        removeItem: async (itemId) => {
            if (_currentUser) {
                const headers = await _getAuthHeaders();
                if (!headers) return;
                await fetch(`/api/cart/${itemId}`, { method: 'DELETE', headers });
            } else {
                _cartItems = _cartItems.filter(i => i.id !== itemId);
                localStorage.setItem(LS_STORAGE_KEY, JSON.stringify(_cartItems));
            }
        },
        
        clearCart: async () => {
            if (_currentUser) {
                const headers = await _getAuthHeaders();
                if(headers) await fetch('/api/cart', { method: 'DELETE', headers });
            }
            _cartItems = [];
            localStorage.removeItem(LS_STORAGE_KEY);
        },

        getItems: () => [..._cartItems],
        getItemCount: () => _cartItems.reduce((total, item) => total + item.quantity, 0),
        getTotalPrice: () => _cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
    };
})();