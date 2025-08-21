// api/server.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Import cookie-parser
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Import the routers
const authRouter = require('./routes/auth'); 
const profileRouter = require('./routes/profile'); 
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // <-- Add this line

// Update the check to include the new service key
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("Error: Supabase URL, Anon Key, or Service Key is missing. Check your root .env file.");
    process.exit(1);
}

// Public client, safe for browser and basic server tasks
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client, for backend use ONLY. Bypasses RLS.
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
app.use(cookieParser()); // Use cookie-parser middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- API ROUTES ---

// The auth router uses the public client, as it deals with user-facing auth flows
app.use('/api/auth', authRouter(supabase));

// The profile router needs the ADMIN client to create/update profiles on behalf of users
app.use('/api/profile', profileRouter(supabaseAdmin)); // <-- PASS THE ADMIN CLIENT
app.use('/api/orders', ordersRouter(supabaseAdmin));
app.use('/api/admin', adminRouter(supabaseAdmin));


// Endpoint to provide public Supabase keys to the frontend
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    });
});

// These public data routes can use the standard client
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