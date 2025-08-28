const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

module.exports = function(supabaseUrl, supabaseAnonKey) {

    const isAuthenticated = async (req, res, next) => {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) return res.status(401).json({ error: 'No authorization header provided.' });
        
        const anonClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken);

        if (authError || !user) return res.status(401).json({ error: 'User not authenticated or session invalid.' });

        req.user = user;
        req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });
        next();
    };

    router.get('/', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;
        const { data, error } = await requestSupabase
            .from('cart_items')
            .select(`*, products(*)`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching cart:', error);
            return res.status(500).json({ error: error.message });
        }

        const cartItems = data.map(item => {
            if (item.product_id) {
                return { id: item.product_id, name: item.products.name, image: item.products.image, price: item.products.effective_price, quantity: item.quantity };
            }
            return { id: item.virtual_item_id, name: item.virtual_item_name, image: item.virtual_item_image, price: item.virtual_item_price, quantity: item.quantity };
        });

        res.json(cartItems);
    });

    // THE FINAL, ROBUST SYNC ENDPOINT
    router.post('/sync', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;
        const { localCart } = req.body;

        if (!Array.isArray(localCart) || localCart.length === 0) {
            return res.status(200).json({ message: 'Sync complete (no items to sync).' });
        }

        const { data: remoteCart, error: fetchError } = await requestSupabase
            .from('cart_items').select('*').eq('user_id', user.id);

        if (fetchError) return res.status(500).json({ error: 'Could not fetch remote cart.' });

        const remoteCartMap = new Map(remoteCart.map(item => [item.product_id || item.virtual_item_id, item]));
        
        const itemsToUpsert = localCart.map(localItem => {
            const remoteItem = remoteCartMap.get(localItem.id);
            // On sync, the local cart's quantity is the source of truth if it's greater.
            const quantity = remoteItem ? Math.max(localItem.quantity, remoteItem.quantity) : localItem.quantity;
            
            const upsertData = {
                user_id: user.id,
                quantity: quantity
            };
            if (typeof localItem.id === 'number') {
                upsertData.product_id = localItem.id;
            } else {
                upsertData.virtual_item_id = localItem.id;
                upsertData.virtual_item_name = localItem.name;
                upsertData.virtual_item_price = localItem.price;
                upsertData.virtual_item_image = localItem.image;
            }
            return upsertData;
        });

        // Separate real and virtual items for targeted upserts
        const realItems = itemsToUpsert.filter(item => item.product_id);
        const virtualItems = itemsToUpsert.filter(item => item.virtual_item_id);

        // Perform upserts separately, targeting the correct constraint for each type
        if (realItems.length > 0) {
            const { error } = await requestSupabase
                .from('cart_items')
                .upsert(realItems, { onConflict: 'user_id, product_id' });
            if (error) {
                console.error("Sync upsert error (real):", error);
                return res.status(500).json({ error: 'Failed to sync real products.' });
            }
        }
        if (virtualItems.length > 0) {
            const { error } = await requestSupabase
                .from('cart_items')
                .upsert(virtualItems, { onConflict: 'user_id, virtual_item_id' });
            if (error) {
                console.error("Sync upsert error (virtual):", error);
                return res.status(500).json({ error: 'Failed to sync virtual items.' });
            }
        }

        res.status(200).json({ message: 'Sync successful.' });
    });


    // Endpoint for adding/incrementing a SINGLE item
    router.post('/', isAuthenticated, async (req, res) => {
        const { user, supabase: requestSupabase } = req;
        const { item } = req.body;

        if (!item || !item.id || !item.quantity) {
            return res.status(400).json({ error: 'A valid item object is required.' });
        }

        const isReal = typeof item.id === 'number';
        const { data: existing } = await requestSupabase.from('cart_items')
            .select('id, quantity').eq(isReal ? 'product_id' : 'virtual_item_id', item.id).single();

        if (existing) {
            const newQuantity = existing.quantity + item.quantity;
            const { error } = await requestSupabase.from('cart_items').update({ quantity: newQuantity }).eq('id', existing.id);
            if (error) return res.status(500).json({ error: 'Failed to update quantity.' });
        } else {
            const newItem = { user_id: user.id, quantity: item.quantity };
            if (isReal) {
                newItem.product_id = item.id;
            } else {
                newItem.virtual_item_id = item.id;
                newItem.virtual_item_name = item.name;
                newItem.virtual_item_price = item.price;
                newItem.virtual_item_image = item.image;
            }
            const { error } = await requestSupabase.from('cart_items').insert(newItem);
            if (error) return res.status(500).json({ error: 'Failed to insert new item.' });
        }
        res.status(200).json({ message: 'Cart updated.' });
    });

    router.put('/:itemId', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;
        const { itemId } = req.params;
        const { quantity } = req.body;
        const isReal = !isNaN(parseInt(itemId));
        const id = isReal ? parseInt(itemId) : itemId;

        if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive.' });

        const { error } = await requestSupabase.from('cart_items').update({ quantity })
            .eq(isReal ? 'product_id' : 'virtual_item_id', id);
        if (error) return res.status(500).json({ error: 'Failed to update quantity.' });
        res.status(200).json({ message: 'Quantity updated.' });
    });

    router.delete('/:itemId', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;
        const { itemId } = req.params;
        const isReal = !isNaN(parseInt(itemId));
        const id = isReal ? parseInt(itemId) : itemId;

        const { error } = await requestSupabase.from('cart_items').delete()
            .eq(isReal ? 'product_id' : 'virtual_item_id', id);
        if (error) return res.status(500).json({ error: 'Failed to remove item.' });
        res.status(200).json({ message: 'Item removed.' });
    });

    router.delete('/', isAuthenticated, async (req, res) => {
        const { supabase: requestSupabase } = req;
        const { error } = await requestSupabase.from('cart_items').delete().match({ user_id: req.user.id });
        if (error) return res.status(500).json({ error: 'Failed to clear cart.' });
        res.status(200).json({ message: 'Cart cleared.' });
    });

    return router;
};