const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    router.get('/', async (req, res) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        const accessToken = req.headers.authorization.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

        if (authError || !user) {
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }

        try {
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select(`
                    id,
                    created_at,
                    total_price,
                    status,
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

            if (ordersError) throw ordersError;

            res.status(200).json(orders);

        } catch (error) {
            console.error('Error fetching user orders:', error);
            return res.status(500).json({ error: 'Failed to fetch order history.' });
        }
    });

    router.post('/', async (req, res) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        const accessToken = req.headers.authorization.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

        if (authError || !user) {
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }

        const { cartItems } = req.body;
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty.' });
        }

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
                    shipping_address: profile
                })
                .select()
                .single();

            if (orderError) throw orderError;

            const orderItemsToInsert = cartItems.map(item => ({
                order_id: newOrder.id,
                product_id: item.id,
                quantity: item.quantity,
                price_at_purchase: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsToInsert);

            if (itemsError) throw itemsError;

            res.status(201).json({ message: 'Order created successfully!', order: newOrder });

        } catch (error) {
            console.error('Error creating order:', error);
            return res.status(500).json({ error: 'Failed to create order.' });
        }
    });

    return router;
};