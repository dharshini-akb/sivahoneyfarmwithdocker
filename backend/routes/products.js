const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function toTitleCase(str) {
  return str
    .replace(/^\d+-/, '') // Remove leading timestamp
    .replace(/^Gemini[_\s]+Generated[_\s]+Image[_\s]*/gi, '') // Remove "Gemini Generated Image" with underscores/spaces
    .replace(/[-_]+/g, ' ') // Replace dashes/underscores with spaces
    .replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') // Remove file extension
    .replace(/\b\w/g, c => c.toUpperCase()) // Capitalize words
    .replace(/\s+/g, ' ') // Clean extra spaces
    .trim();
}

async function readUploadsAsProducts() {
  try {
    const UPLOADS_DIR = path.join(__dirname, '../uploads');
    const PRODUCTS_DIR = path.join(__dirname, '../public/products');
    
    let files = [];
    
    // Try uploads folder first
    if (fs.existsSync(UPLOADS_DIR)) {
      files = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
        .filter(ent => ent.isFile() && ALLOWED_IMAGE_EXT.has(path.extname(ent.name).toLowerCase()))
        .map(ent => ({ name: ent.name, folder: 'uploads' }));
    }
    
    // If empty, try public/products folder
    if (files.length === 0 && fs.existsSync(PRODUCTS_DIR)) {
      files = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
        .filter(ent => ent.isFile() && ALLOWED_IMAGE_EXT.has(path.extname(ent.name).toLowerCase()))
        .map(ent => ({ name: ent.name, folder: 'products' }));
    }

    const products = [];
    for (const [idx, f] of files.entries()) {
      const lowerFile = f.name.toLowerCase();
      let category = 'organic';
      if (lowerFile.includes('honey')) category = 'honey';
      else if (lowerFile.includes('shampoo')) category = 'shampoo';
      else if (lowerFile.includes('masala') || lowerFile.includes('podi') || lowerFile.includes('powder')) category = 'masala';
      else if (lowerFile.includes('soap')) category = 'soap';
      else if (lowerFile.includes('oil')) category = 'oil';
      else if (lowerFile.includes('malt')) category = 'malt';
      else if (lowerFile.includes('washing')) category = 'washingpowder';

      const imagePath = `${f.folder}/${f.name}`;
      
      // Try to find existing product by image path or name
      let dbProduct = null;
      if (mongoose.connection.readyState === 1) {
        dbProduct = await Product.findOne({ 
          $or: [
            { image: imagePath },
            { name: toTitleCase(f.name) }
          ]
        });

        if (!dbProduct) {
          // Create it if it doesn't exist
          dbProduct = new Product({
            name: toTitleCase(f.name),
            description: `Premium ${toTitleCase(f.name)} from Siva Honey Farm.`,
            price: 500,
            category: category,
            stock: 100,
            image: imagePath
          });
          await dbProduct.save();
        }
      }

      if (dbProduct) {
        products.push(dbProduct);
      } else {
        // Fallback if DB is not connected
        products.push({
          _id: `fs_${idx}_${f.name}`,
          name: toTitleCase(f.name),
          description: '',
          price: 500,
          category: category,
          stock: 100,
          image: imagePath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    return products;
  } catch (e) {
    console.error('Error reading directories:', e);
    return [];
  }
}

// @route   GET /api/products
// @desc    Get all products (with optional filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, source, fs: fsFlag } = req.query;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, falling back to filesystem products');
      const fsProds = await readUploadsAsProducts();
      return res.json(fsProds);
    }

    if (source === 'uploads' || fsFlag === 'true') {
      const fsProducts = await readUploadsAsProducts();
      // Optional category/search filtering for fs products
      const filtered = fsProducts.filter(p => {
        let ok = true;
        if (category) ok = ok && p.category === category;
        if (search) ok = ok && (p.name.toLowerCase().includes(search.toLowerCase()));
        return ok;
      });
      return res.json(filtered);
    }

    const query = {};

    if (category) {
      query.category = category;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    if (products && products.length > 0) {
      return res.json(products);
    }
    
    // Fallback to filesystem products if DB is empty
    const fsProducts = await readUploadsAsProducts();
    return res.json(fsProducts);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      message: 'Error fetching products', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (id.startsWith('fs_')) {
      const fsProducts = await readUploadsAsProducts();
      const product = fsProducts.find(p => p._id.toString() === id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(product);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Invalid product ID format' });
    }

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

module.exports = router;
