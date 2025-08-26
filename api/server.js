// api/server.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Import the routers
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const packagesRouter = require('./routes/packages'); // This router is imported but not used in server.js, might be a leftover or intended for future use in admin part
const builderRouter = require('./routes/builder');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("Error: Supabase URL, Anon Key, or Service Key is missing. Check your root .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- API ROUTES ---

app.use('/api/auth', authRouter(supabase));
app.use('/api/profile', profileRouter(supabaseAdmin));
app.use('/api/orders', ordersRouter(supabaseAdmin));
app.use('/api/admin', adminRouter(supabaseAdmin));
app.use('/api/builder', builderRouter(supabase));


app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    });
});

app.get('/api/products', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let countQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
        .from('products')
        .select('*, brands(name)');
    
    // --- Apply Filters on the Backend ---
    const { category, brand_id, sort } = req.query;
    if (category) {
        countQuery = countQuery.eq('category', category);
        dataQuery = dataQuery.eq('category', category);
    }
    if (brand_id) {
        countQuery = countQuery.eq('brand_id', brand_id);
        dataQuery = dataQuery.eq('brand_id', brand_id);
    }
    
    // --- Apply Sorting on the Backend (FIXED) ---
    // Now we sort by the pre-computed 'effective_price' column
    if (sort === 'price-asc') {
        dataQuery = dataQuery.order('effective_price', { ascending: true });
    } else if (sort === 'price-desc') {
        dataQuery = dataQuery.order('effective_price', { ascending: false });
    } else {
        // Default sort if no specific price sort is requested
        dataQuery = dataQuery.order('id', { ascending: true }); 
    }

    // Apply range after all filters and orders have been applied
    dataQuery = dataQuery.range(from, to);

    try {
        const { data, error } = await dataQuery;
        const { count, error: countError } = await countQuery;

        if (error || countError) {
            console.error("Supabase query error:", error || countError);
            throw error || countError;
        }

        res.json({
            products: data,
            totalProducts: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        console.error("API /api/products error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categories', async (req, res) => {
    const { data, error } = await supabase.from('categories').select('name, image_url');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/brands', async (req, res) => {
    const { data, error } = await supabase.from('brands').select('id, name, logo_url');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
})

app.get('/api/packages', async (req, res) => {
    const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('id');
        
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/products/search', async (req, res) => {
    const { q } = req.query; 

    if (!q) {
        return res.status(400).json({ error: 'Search query is required.' });
    }

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('products')
        .select('*') 
        .eq('id', id)
        .single(); 

    if (error) {
        return res.status(404).json({ error: 'Product not found' });
    }
    res.json(data);
});

// --- CATCH-ALL ROUTE ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});