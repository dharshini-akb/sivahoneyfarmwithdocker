const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    // Manually populate product items since some might be filesystem IDs
    const items = await Promise.all(cart.items.map(async (item) => {
      const productId = item.product.toString();
      
      if (productId && productId.startsWith('fs_')) {
        // Extract filename from fs_#_filename format
        const filename = productId.replace(/^fs_\d+_/, '');
        return {
          productId: productId,
          quantity: item.quantity,
          price: item.price,
          product: {
            _id: productId,
            name: filename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            price: item.price || 500,
            image: `uploads/${filename}`,
            category: 'organic'
          }
        };
      } else if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        const product = await Product.findById(productId).select('name price image category');
        if (product) {
          return {
            productId: product._id,
            quantity: item.quantity,
            price: item.price,
            product: product
          };
        }
      }
      return null;
    }));

    const filteredItems = items.filter(item => item !== null);
    res.json({ items: filteredItems, total: cart.totalAmount });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Error fetching cart' });
  }
});

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Validate product (handle filesystem products)
    let product;
    if (productId && typeof productId === 'string' && productId.startsWith('fs_')) {
      // Filesystem product - don't check DB
      product = { _id: productId, price: 500 };
    } else if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
    } else {
      // Not a valid ObjectId and not an fs_ product
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );
    
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity || 1;
    } else {
      cart.items.push({
        product: productId,
        quantity: quantity || 1,
        price: product.price
      });
    }

    await cart.save();

    // Handle filesystem products
    const items = cart.items.map(item => {
      if (item.product.toString().startsWith('fs_')) {
        // Extract filename from fs_#_filename format
        const filename = item.product.toString().replace(/^fs_\d+_/, '');
        return {
          productId: item.product,
          quantity: item.quantity,
          product: {
            _id: item.product,
            name: filename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            price: item.price || 500,
            image: `uploads/${filename}`,
            category: 'organic'
          }
        };
      } else {
        return {
          productId: item.product._id,
          quantity: item.quantity,
          product: item.product
        };
      }
    });

    res.json({ items, total: cart.totalAmount });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Error adding to cart' });
  }
});

// @route   PUT /api/cart/:productId
// @desc    Update cart item quantity
// @access  Private
router.put('/:productId', auth, async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === req.params.productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await cart.populate('items.product', 'name price image category');

    const items = cart.items.map(item => ({
      productId: item.product._id,
      quantity: item.quantity,
      product: item.product
    }));

    res.json({ items, total: cart.totalAmount });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Error updating cart' });
  }
});

// @route   DELETE /api/cart/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/:productId', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== req.params.productId
    );

    await cart.save();
    await cart.populate('items.product', 'name price image category');

    const items = cart.items.map(item => ({
      productId: item.product._id,
      quantity: item.quantity,
      product: item.product
    }));

    res.json({ items, total: cart.totalAmount });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Error removing from cart' });
  }
});

// @route   DELETE /api/cart
// @desc    Clear cart
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [], totalAmount: 0 },
      { new: true, upsert: true }
    );

    res.json({ items: [], total: 0 });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Error clearing cart' });
  }
});

module.exports = router;
