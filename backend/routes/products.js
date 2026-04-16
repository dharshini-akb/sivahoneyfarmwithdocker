const express = require('express');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function toTitleCase(str) {
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\.\w+$/, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function readUploadsAsProducts() {
  try {
    const files = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
      .filter(ent => ent.isFile() && ALLOWED_IMAGE_EXT.has(path.extname(ent.name).toLowerCase()))
      .map(ent => ent.name);
    return files.map((file, idx) => {
      const lowerFile = file.toLowerCase();
      let category = 'organic';
      if (lowerFile.includes('honey')) category = 'honey';
      else if (lowerFile.includes('shampoo')) category = 'shampoo';
      else if (lowerFile.includes('masala') || lowerFile.includes('podi') || lowerFile.includes('powder')) category = 'masala';
      else if (lowerFile.includes('soap')) category = 'soap';
      else if (lowerFile.includes('oil')) category = 'oil';
      else if (lowerFile.includes('malt')) category = 'malt';
      else if (lowerFile.includes('washing')) category = 'washingpowder';

      return {
        _id: `fs_${idx}_${file}`,
        name: toTitleCase(file),
        description: '',
        price: 500,
        category: category,
        stock: 100,
        image: `uploads/${file}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  } catch (e) {
    return [];
  }
}

// @route   GET /api/products
// @desc    Get all products (with optional filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, source, fs: fsFlag } = req.query;
    if (source === 'uploads' || fsFlag === 'true') {
      const fsProducts = readUploadsAsProducts();
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
    if (products.length > 0) {
      return res.json(products);
    }
    // Fallback to filesystem products if DB is empty
    const fsProducts = readUploadsAsProducts();
    return res.json(fsProducts);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (id.startsWith('fs_')) {
      const fsProducts = readUploadsAsProducts();
      const product = fsProducts.find(p => p._id === id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(product);
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
