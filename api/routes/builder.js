const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    router.get('/components', async (req, res) => {
        const { category, cpu_socket_id, ram_type_id } = req.query;

        if (!category) {
            return res.status(400).json({ error: 'A component category is required.' });
        }

        let query = supabase
            .from('products')
            .select('*')
            .eq('category', category); // Always filter by the main category

        // --- IMPROVED LOGIC ---
        // Apply compatibility filters ONLY when they are relevant and provided.
        if (category === 'Motherboards' && cpu_socket_id) {
            query = query.eq('cpu_socket_id', cpu_socket_id);
        }
        if (category === 'RAM' && ram_type_id) {
            query = query.eq('ram_type_id', ram_type_id);
        }
        
        // For categories like Monitors, Casings, PSUs, etc., no further filtering is needed.
        // The initial .eq('category', category) is sufficient.

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching builder components:', error);
            return res.status(500).json({ error: 'Failed to fetch components.' });
        }

        res.json(data);
    });

    return router;
};