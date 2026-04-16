const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const { sendOrderEmail } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { items, shippingInfo, paymentMethod, paymentId, totalAmount } = req.body;

    // Enforce Cash on Delivery only
    if (paymentMethod !== 'cod') {
      return res.status(400).json({ message: 'Only Cash on Delivery is currently supported' });
    }
    
    let subtotal = 0;
    const orderItems = [];
    let totalItemsCount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      totalItemsCount += item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        category: product.category,
        quantity: item.quantity,
        price: product.price
      });

      // Update stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate Discounts
    let discountAmount = 0;
    let discountDetails = [];

    // 1. Combo Discount (Buy 2 get 10%, Buy 3+ get 20%)
    if (totalItemsCount === 2) {
      const comboDiscount = subtotal * 0.10;
      discountAmount += comboDiscount;
      discountDetails.push({ type: 'Combo Discount', amount: comboDiscount, percentage: '10%' });
    } else if (totalItemsCount >= 3) {
      const comboDiscount = subtotal * 0.20;
      discountAmount += comboDiscount;
      discountDetails.push({ type: 'Combo Discount', amount: comboDiscount, percentage: '20%' });
    }

    // 2. First User Discount (10% off for the first order)
    const existingOrders = await Order.countDocuments({ user: req.user.id });
    if (existingOrders === 0) {
      const firstUserDiscount = (subtotal - discountAmount) * 0.10;
      discountAmount += firstUserDiscount;
      discountDetails.push({ type: 'First User Discount', amount: firstUserDiscount, percentage: '10%' });
    }

    const finalTotal = subtotal - discountAmount;

    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      shippingInfo,
      paymentMethod,
      paymentId,
      subtotal: subtotal,
      discountAmount: discountAmount,
      discountDetails: discountDetails,
      totalAmount: finalTotal,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : (paymentId ? 'completed' : 'pending')
    });

    await order.save();

    // Send email notification (asynchronous, don't block response)
    sendOrderEmail(order._id).catch(err => console.error('Background email error:', err));

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name image price')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name image price')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// @route   GET /api/orders/admin/all
// @desc    Get all orders (Admin only)
// @access  Private (Admin)
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const orders = await Order.find()
      .populate('items.product', 'name image price')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { orderStatus } = req.body;
    
    if (!['pending', 'confirmed', 'delivered'].includes(orderStatus)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    ).populate('items.product', 'name image price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

module.exports = router;
