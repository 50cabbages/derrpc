const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

module.exports = function(supabaseUrl, supabaseAnonKey) {

    const isAuthenticated = async (req, res, next) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        const accessToken = req.headers.authorization.split(' ')[1];
        
        const anonClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken);

        if (authError || !user) {
            console.error('Authentication failed in isAuthenticated:', authError?.message || 'No user', { accessToken });
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }

        req.user = user;
        req.accessToken = accessToken;

        req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });
        next();
    };

    router.get('/', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;

        const { data, error } = await requestSupabase
            .from('cart_items')
            .select(`
                product_id,
                quantity,
                products (
                    name,
                    image,
                    price,
                    sale_price,
                    effective_price
                )
            `)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching cart:', error);
            return res.status(500).json({ error: error.message });
        }

        const cartItems = data.map(item => ({
            id: item.product_id,
            name: item.products.name,
            image: item.products.image,
            price: item.products.effective_price,
            quantity: item.quantity
        }));

        res.json(cartItems);
    });

    router.post('/', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;
        const { productId, quantity = 1 } = req.body;

        if (!productId || quantity <= 0) {
            return res.status(400).json({ error: 'Product ID and a positive quantity are required.' });
        }

        const { data: existingItem, error: fetchError } = await requestSupabase
            .from('cart_items')
            .select('id, quantity, user_id')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existing cart item:', fetchError);
            return res.status(500).json({ error: 'Failed to check cart item.' });
        }

        let resultData, resultError;

        if (existingItem) {
            if (existingItem.user_id !== user.id) {
                console.warn(`Potential RLS bypass attempt: User ${user.id} tried to modify item ${existingItem.id} owned by ${existingItem.user_id}`);
                return res.status(403).json({ error: 'Forbidden: You do not own this cart item.' });
            }

            const newQuantity = existingItem.quantity + quantity;
            ({ data: resultData, error: resultError } = await requestSupabase
                .from('cart_items')
                .update({ quantity: newQuantity })
                .eq('id', existingItem.id)
                .eq('user_id', user.id)
                .select()
                .single());
        } else {
            ({ data: resultData, error: resultError } = await requestSupabase
                .from('cart_items')
                .insert({ user_id: user.id, product_id: productId, quantity })
                .select()
                .single());
        }

        if (resultError) {
            console.error('Error adding/updating cart item:', resultError);
            if (resultError.message && resultError.message.includes('row-level security policy')) {
                console.error('RLS violation details during POST:', { userId: user.id, productId, quantity, isExisting: !!existingItem });
            }
            return res.status(500).json({ error: 'Failed to add/update cart item.', details: resultError.message });
        }

        res.status(200).json({ message: 'Cart item updated successfully!', cartItem: resultData });
    });

    router.put('/:productId', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;
        const productId = parseInt(req.params.productId, 10);
        const { quantity } = req.body;

        if (isNaN(productId) || quantity === undefined || quantity < 0) {
            return res.status(400).json({ error: 'Product ID and a valid quantity (0 or more) are required.' });
        }

        if (quantity === 0) {
            const { error } = await requestSupabase
                .from('cart_items')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId);

            if (error) {
                console.error('Error deleting cart item:', error);
                return res.status(500).json({ error: 'Failed to remove cart item.' });
            }
            return res.status(200).json({ message: 'Cart item removed successfully.' });
        } else {
            const { data, error } = await requestSupabase
                .from('cart_items')
                .update({ quantity })
                .eq('user_id', user.id)
                .eq('product_id', productId)
                .select()
                .single();

            if (error) {
                console.error('Error updating cart item quantity:', error);
                if (error.message && error.message.includes('row-level security policy')) {
                    console.error('RLS violation details during PUT:', { userId: user.id, productId, quantity });
                }
                return res.status(500).json({ error: 'Failed to update cart item quantity.' });
            }
            return res.status(200).json({ message: 'Cart item quantity updated successfully!', cartItem: data });
        }
    });

    router.delete('/:productId', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;
        const productId = parseInt(req.params.productId, 10);

        if (isNaN(productId)) {
            return res.status(400).json({ error: 'Product ID is required.' });
        }

        const { error } = await requestSupabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId);

        if (error) {
            console.error('Error deleting cart item:', error);
            if (error.message && error.message.includes('row-level security policy')) {
                console.error('RLS violation details during DELETE (single):', { userId: user.id, productId });
            }
            return res.status(500).json({ error: 'Failed to remove cart item.' });
        }

        res.status(200).json({ message: 'Cart item removed successfully.' });
    });

    router.delete('/', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;

        const { error } = await requestSupabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error('Error clearing cart:', error);
            if (error.message && error.message.includes('row-level security policy')) {
                console.error('RLS violation details during DELETE (all):', { userId: user.id });
            }
            return res.status(500).json({ error: 'Failed to clear cart.' });
        }

        res.status(200).json({ message: 'Cart cleared successfully.' });
    });

    return router;
};