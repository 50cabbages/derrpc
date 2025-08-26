const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    const isAuthenticated = async (req, res, next) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        const accessToken = req.headers.authorization.split(' ')[1];
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

        if (authError || !user) {
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }

        req.user = user;
        next();
    };

    router.get('/', isAuthenticated, async (req, res) => {
        const { user } = req;

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                created_at,
                total_price,
                status,
                virtual_items, -- FETCH THE NEW VIRTUAL ITEMS COLUMN
                profiles (full_name),
                order_items (
                    quantity,
                    price_at_purchase,
                    products (
                        name,
                        image
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('Error fetching user orders:', ordersError);
            return res.status(500).json({ error: 'Failed to fetch order history.' });
        }

        res.status(200).json(orders);
    });

    router.post('/', isAuthenticated, async (req, res) => {
        const { user } = req;
        const { cartItems } = req.body;
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty.' });
        }

        // Separate real products (numeric IDs) from virtual items (string IDs)
        const realProductItems = cartItems.filter(item => typeof item.id === 'number' && !isNaN(item.id));
        const virtualCartItems = cartItems.filter(item => typeof item.id === 'string' && (item.id.startsWith('pkg-') || item.id.startsWith('build-')));
        
        const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('address_line1, address_line2, city, province, postal_code')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("Error fetching profile for order:", profileError);
            return res.status(500).json({ error: 'Could not retrieve shipping address.' });
        }

        try {
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    total_price: totalPrice,
                    shipping_address: profile,
                    // Store virtual items as JSONB in the new column
                    virtual_items: virtualCartItems.length > 0 ? virtualCartItems : null 
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Only insert real products into order_items table
            if (realProductItems.length > 0) {
                const orderItemsToInsert = realProductItems.map(item => ({
                    order_id: newOrder.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price_at_purchase: item.price
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItemsToInsert);

                if (itemsError) throw itemsError;
            }

            res.status(201).json({ message: 'Order created successfully!', order: newOrder });

        } catch (error) {
            console.error('Error creating order:', error);
            return res.status(500).json({ error: 'Failed to create order.' });
        }
    });

    return router;
};