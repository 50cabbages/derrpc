// api/server.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Import cookie-parser
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Import the auth router
const authRouter = require('./routes/auth'); 

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: Supabase URL or Key is missing. Check your root .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(cookieParser()); // Use cookie-parser middleware
app.use(express.static(path.join(__dirname, '../public')));

// --- API ROUTES ---

// Mount the authentication router under the /api/auth path
app.use('/api/auth', authRouter(supabase));

// Endpoint to provide public Supabase keys to the frontend
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    });
});

app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/categories', async (req, res) => {
    const { data, error } = await supabase.from('categories').select('name, image_url');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/brands', async (req, res) => {
    const { data, error } = await supabase.from('brands').select('name, logo_url');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// --- CATCH-ALL ROUTE ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});