// api/routes/profile.js

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    /**
     * @route GET /api/profile
     * @description Fetches the profile for the current user using the provided JWT.
     */
    router.get('/', async (req, res) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        const accessToken = req.headers.authorization.split(' ')[1];

        // --- THE DEFINITIVE FIX: A more robust check for the user object ---
        const { data, error: authError } = await supabase.auth.getUser(accessToken);

        // This check handles all failure cases:
        // 1. An explicit authentication error occurs.
        // 2. The token is valid, but no user object is returned in the data.
        if (authError || !data.user) {
            console.error('Authentication error or no user found:', authError);
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }
        
        // If we get here, we are guaranteed to have a valid user object.
        const user = data.user;
        // --- END OF FIX ---

        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code === 'PGRST116') {
            const fullNameFromAuth = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({ id: user.id, full_name: fullNameFromAuth })
                .select()
                .single();
            if (insertError) {
                console.error("Error creating profile:", insertError);
                return res.status(500).json({ error: 'Failed to create user profile.' });
            }
            profile = newProfile;
        } else if (profileError) {
            console.error("Error fetching profile:", profileError);
            return res.status(500).json({ error: 'Failed to fetch profile data.' });
        }
        
        res.json(profile);
    });

    /**
     * @route PUT /api/profile
     * @description Updates the profile of the currently authenticated user.
     */
    router.put('/', async (req, res) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No authorization header provided.' });
        }
        const accessToken = req.headers.authorization.split(' ')[1];
        
        // --- APPLY THE SAME FIX HERE ---
        const { data, error: authError } = await supabase.auth.getUser(accessToken);
        if (authError || !data.user) {
            return res.status(401).json({ error: 'User not authenticated or session invalid.' });
        }
        const user = data.user;
        // --- END OF FIX ---
        
        const { full_name, phone_number, address_line1, address_line2, city, province, postal_code } = req.body;

        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
                full_name, phone_number, address_line1, address_line2, city, province, postal_code,
                updated_at: new Date()
            })
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return res.status(500).json({ error: 'Failed to update profile.' });
        }

        res.json({ message: 'Profile updated successfully!', profile: updatedProfile });
    });

    return router;
};