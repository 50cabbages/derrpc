const express = require('express');
const router = express.Router();

module.exports = function(supabase, isAdmin) {

    // GET all packages (for admin list)
    router.get('/', isAdmin, async (req, res) => {
        const { data, error } = await supabase
            .from('packages')
            .select('*')
            .order('id');
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    // POST a new package
    router.post('/', isAdmin, async (req, res) => {
        const { name, image_url, price_complete, price_unit_only, description, is_active } = req.body;
        if (!name || !price_complete || !image_url) {
            return res.status(400).json({ error: 'Name, price, and image URL are required.' });
        }
        
        const { data, error } = await supabase
            .from('packages')
            .insert({ name, image_url, price_complete, price_unit_only, description, is_active })
            .select()
            .single();

        if (error) return res.status(500).json({ error: 'Failed to create package.' });
        res.status(201).json({ message: 'Package created successfully!', package: data });
    });

    return router;
};