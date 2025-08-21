// api/routes/admin.js
const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    const isAdmin = async (req, res, next) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        const accessToken = req.headers.authorization.split(' ')[1];
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

        if (authError || !user) {
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }

        req.user = user;
        next();
    };

    router.get('/products', isAdmin, async (req, res) => {
        const { data, error } = await supabase.from('products').select('*').order('id');
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    router.post('/products', isAdmin, async (req, res) => {
        const { name, category, price, image, description } = req.body;
        if (!name || !category || !price) {
            return res.status(400).json({ error: 'Name, category, and price are required.' });
        }
        const { data, error } = await supabase
            .from('products')
            .insert({ name, category, price, image, description })
            .select()
            .single();
        if (error) return res.status(500).json({ error: 'Failed to create product.' });
        res.status(201).json({ message: 'Product created successfully!', product: data });
    });

    router.get('/products/:id', isAdmin, async (req, res) => {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found.' });
            return res.status(500).json({ error: 'Failed to fetch product data.' });
        }
        res.json(data);
    });

    router.put('/products/:id', isAdmin, async (req, res) => {
        const { id } = req.params;
        const { name, category, price, image, description } = req.body;
        if (!name || !category || !price) {
            return res.status(400).json({ error: 'Name, category, and price are required.' });
        }
        const { data, error } = await supabase
            .from('products')
            .update({ name, category, price, image, description })
            .eq('id', id)
            .select()
            .single();
        if (error) return res.status(500).json({ error: 'Failed to update product.' });
        res.status(200).json({ message: 'Product updated successfully!', product: data });
    });

    return router;
};