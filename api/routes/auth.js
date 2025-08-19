// api/routes/auth.js

const express = require('express');
const router = express.Router();

// This function creates the router and accepts the Supabase client as a dependency
module.exports = function(supabase) {

    /**
     * @route GET /api/auth/google
     * @description Initiates the Google OAuth login flow.
     */
    router.get('/google', async (req, res) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // The URL Supabase redirects to after a successful login from Google.
                redirectTo: 'http://localhost:3000' 
            }
        });

        if (error) {
            console.error('Error initiating Google login:', error.message);
            return res.status(500).json({ error: 'Could not initiate login flow.' });
        }
        
        // Redirect the user's browser to the Supabase-generated Google login URL.
        res.redirect(data.url);
    });
    
    /**
     * @route POST /api/auth/logout
     * @description Logs the user out by clearing the session.
     */
    router.post('/logout', async (req, res) => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error logging out:', error.message);
            return res.status(500).json({ error: 'Logout failed.' });
        }
        
        res.status(200).json({ message: 'Logged out successfully.' });
    });

    /**
     * @route GET /api/auth/session
     * @description Checks if a user is currently authenticated based on their cookie/token.
     */
    router.get('/session', async (req, res) => {
        // supabase.auth.getUser() automatically reads the JWT from the request cookies.
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // Return the user object if the session is valid.
        res.status(200).json({ user });
    });

    return router;
};