const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

module.exports = function(supabaseUrl, supabaseAnonKey) {

    // Middleware to create a user-specific Supabase client
    const isAuthenticated = async (req, res, next) => {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        
        // Use a temporary client to get the user
        const anonClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken);

        if (authError || !user) {
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }

        req.user = user;
        // Create a Supabase client authenticated as the user for RLS
        req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });
        next();
    };

    // GET /api/cart - Fetches the user's complete cart
    router.get('/', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;

        const { data, error } = await requestSupabase
            .from('cart_items')
            .select(`
                quantity,
                product_id,
                products ( name, image, price, sale_price, effective_price ),
                virtual_item_id,
                virtual_item_name,
                virtual_item_price,
                virtual_item_image
            `);

        if (error) {
            console.error('Error fetching cart:', error);
            return res.status(500).json({ error: error.message });
        }

        // Map the mixed data into a consistent format for the frontend
        const cartItems = data.map(item => {
            if (item.product_id) { // It's a real product
                return {
                    id: item.product_id,
                    name: item.products.name,
                    image: item.products.image,
                    price: item.products.effective_price,
                    quantity: item.quantity
                };
            } else { // It's a virtual item
                return {
                    id: item.virtual_item_id,
                    name: item.virtual_item_name,
                    image: item.virtual_item_image,
                    price: item.virtual_item_price,
                    quantity: item.quantity
                };
            }
        });

        res.json(cartItems);
    });

    // POST /api/cart - Adds or updates an item in the cart
    router.post('/', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;
        const { item } = req.body; // Expect a full item object now

        if (!item || !item.id || !item.quantity) {
            return res.status(400).json({ error: 'A valid item object with id and quantity is required.' });
        }

        const isRealProduct = typeof item.id === 'number';

        const { data: existingItem, error: fetchError } = await requestSupabase
            .from('cart_items')
            .select('id, quantity')
            .eq(isRealProduct ? 'product_id' : 'virtual_item_id', item.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means 'not found', which is fine
            return res.status(500).json({ error: 'Failed to check for existing cart item.' });
        }

        let resultData, resultError;

        if (existingItem) {
            // Item exists, update its quantity
            const newQuantity = existingItem.quantity + item.quantity;
            ({ data: resultData, error: resultError } = await requestSupabase
                .from('cart_items')
                .update({ quantity: newQuantity })
                .eq('id', existingItem.id)
                .select()
                .single());
        } else {
            // Item does not exist, insert it
            const itemToInsert = {
                user_id: user.id,
                quantity: item.quantity,
            };
            if (isRealProduct) {
                itemToInsert.product_id = item.id;
            } else {
                itemToInsert.virtual_item_id = item.id;
                itemToInsert.virtual_item_name = item.name;
                itemToInsert.virtual_item_price = item.price;
                itemToInsert.virtual_item_image = item.image;
            }
            ({ data: resultData, error: resultError } = await requestSupabase
                .from('cart_items')
                .insert(itemToInsert)
                .select()
                .single());
        }

        if (resultError) {
            console.error('Error adding/updating cart item:', resultError);
            return res.status(500).json({ error: 'Failed to add/update cart item.', details: resultError.message });
        }

        res.status(200).json({ message: 'Cart updated successfully!', cartItem: resultData });
    });

    // PUT /api/cart/:itemId - Updates an item's quantity
    router.put('/:itemId', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;
        const { itemId } = req.params;
        const { quantity } = req.body;
        
        const isRealProduct = !isNaN(parseInt(itemId));
        const id = isRealProduct ? parseInt(itemId) : itemId;

        if (quantity <= 0) { // Let's use DELETE for removal
            return res.status(400).json({ error: 'Quantity must be positive. Use DELETE to remove.' });
        }

        const { data, error } = await requestSupabase
            .from('cart_items')
            .update({ quantity })
            .eq(isRealProduct ? 'product_id' : 'virtual_item_id', id)
            .select();

        if (error) return res.status(500).json({ error: 'Failed to update item quantity.' });
        res.status(200).json({ message: 'Quantity updated!', item: data });
    });

    // DELETE /api/cart/:itemId - Removes an item
    router.delete('/:itemId', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;
        const { itemId } = req.params;

        const isRealProduct = !isNaN(parseInt(itemId));
        const id = isRealProduct ? parseInt(itemId) : itemId;

        const { error } = await requestSupabase
            .from('cart_items')
            .delete()
            .eq(isRealProduct ? 'product_id' : 'virtual_item_id', id);

        if (error) return res.status(500).json({ error: 'Failed to remove item.' });
        res.status(200).json({ message: 'Item removed successfully.' });
    });

    // DELETE /api/cart - Clears the entire cart for the user
    router.delete('/', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;
        const { error } = await requestSupabase.from('cart_items').delete().match({ user_id: req.user.id });
        if (error) return res.status(500).json({ error: 'Failed to clear cart.' });
        res.status(200).json({ message: 'Cart cleared successfully.' });
    });

    return router;
};