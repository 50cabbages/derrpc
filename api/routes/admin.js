const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const toTitleCase = (str) => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
    const productData = req.body;

    if (!productData.name || !productData.category || !productData.price) {
        return res.status(400).json({ error: 'Name, category, and price are required.' });
    }

    productData.category = toTitleCase(productData.category);

    if (productData.category) {
        const { error: upsertError } = await supabase
            .from('categories')
            .upsert({ name: productData.category }, { onConflict: 'name' });
        
        if (upsertError) {
            console.error('Error upserting category:', upsertError);
        }
    }

    // THE FIX: Remove the temporary property before inserting.
    // It's not needed for 'add' but good practice to ensure it's clean.
    delete productData.originalImages;

    const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select().single();

    if (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ error: 'Failed to create product.', details: error });
    }
    res.status(201).json({ message: 'Product created successfully!', product: data });
});

// --- End of Replacement for POST /products ---


// --- Start of Replacement for PUT /products/:id ---

router.put('/products/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const productData = req.body;
    
    if (!productData.name || !productData.category || !productData.price) {
        return res.status(400).json({ error: 'Name, category, and price are required.' });
    }
    
    productData.category = toTitleCase(productData.category);
    
    if (productData.category) {
        const { error: upsertError } = await supabase
            .from('categories')
            .upsert({ name: productData.category }, { onConflict: 'name' });
        
        if (upsertError) {
            console.error('Error upserting category:', upsertError);
        }
    }

    if (productData.originalImages && Array.isArray(productData.originalImages)) {
        const newImages = [productData.image, productData.image_2, productData.image_3, productData.image_4].filter(Boolean);
        const imagesToDelete = productData.originalImages.filter(oldImg => !newImages.includes(oldImg));
        if (imagesToDelete.length > 0) {
            const fileNamesToDelete = imagesToDelete.map(url => url.split('/').pop());
            await supabase.storage.from('product-images').remove(fileNamesToDelete);
        }
    }
    
    // THE FIX: Remove the temporary property before updating.
    delete productData.originalImages;

    const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select().single();

    if (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ error: 'Failed to update product.', details: error });
    }
    res.status(200).json({ message: 'Product updated successfully!', product: data });
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



    router.delete('/products/:id', isAdmin, async (req, res) => {
        const { id } = req.params;
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        if (error) {
            console.error("Error deleting product:", error);
            return res.status(500).json({ error: 'Failed to delete product.' });
        }
        res.status(200).json({ message: 'Product deleted successfully!' });
    });

    router.get('/orders', isAdmin, async (req, res) => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                created_at,
                total_price,
                status,
                profiles (
                    full_name
                )
            `)
            .order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching all orders:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    });

    router.get('/orders/:id', isAdmin, async (req, res) => {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles (full_name),
                order_items (
                    quantity,
                    price_at_purchase,
                    products (name, image)
                )
            `)
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Order not found.' });
            return res.status(500).json({ error: 'Failed to fetch order details.' });
        }
        res.json(data);
    });

    router.put('/orders/:id', isAdmin, async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required.' });
        }
        const { data, error } = await supabase
            .from('orders')
            .update({ status: status })
            .eq('id', id)
            .select('id, status')
            .single();
        if (error) {
            return res.status(500).json({ error: 'Failed to update order status.' });
        }
        res.status(200).json({ message: 'Order status updated!', order: data });
    });

    router.post('/upload-image', isAdmin, upload.single('productImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }

    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
    
    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ error: 'Failed to upload image.' });
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

    res.status(200).json({ imageUrl: publicUrl });
});

  router.get('/packages', isAdmin, async (req, res) => {
        const { data, error } = await supabase.from('packages').select('*').order('id');
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

router.post('/packages', isAdmin, async (req, res) => {
    const { name, image_url, price_complete, price_unit_only, description, is_active, category } = req.body;
    if (!name || !price_complete || !image_url) {
        return res.status(400).json({ error: 'Name, price, and image URL are required.' });
    }
    
    const { data, error } = await supabase
        .from('packages')
        .insert({ name, image_url, price_complete, price_unit_only, description, is_active, category }) // <-- Add category here
        .select().single();

    if (error) return res.status(500).json({ error: 'Failed to create package.' });
    res.status(201).json({ message: 'Package created successfully!', package: data });
});

    return router;
};