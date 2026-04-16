const express = require('express');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { adminAuth } = require('../middleware/auth');
const { sendOrderEmail } = require('../utils/emailService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/products/'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// @route   POST /api/admin/products
// @desc    Add a new product
// @access  Private (Admin)
router.post('/products', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, featured, imageUrl } = req.body;
    
    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category: category || 'organic',
      stock: parseInt(stock) || 0,
      featured: featured === 'true',
      image: req.file ? `products/${req.file.filename}` : (imageUrl || ''),
      createdBy: req.user.id
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Error adding product' });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Update a product
// @access  Private (Admin)
router.put('/products/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, featured, imageUrl } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price ? parseFloat(price) : product.price;
    product.category = category || product.category;
    product.stock = stock ? parseInt(stock) : product.stock;
    product.featured = featured !== undefined ? featured === 'true' : product.featured;
    
    if (req.file) {
      product.image = `products/${req.file.filename}`;
    } else if (imageUrl) {
      product.image = imageUrl;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete a product
// @access  Private (Admin)
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalSales = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalProducts,
      totalOrders,
      totalSales: totalSales[0]?.total || 0,
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Private (Admin)
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name image price')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.put('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { orderStatus, paymentStatus, paymentMethod } = req.body;
    
    const updateData = {};
    if (orderStatus) {
      if (!['pending', 'confirmed', 'delivered'].includes(orderStatus)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
      updateData.orderStatus = orderStatus;
    }
    
    if (paymentStatus) {
      if (!['pending', 'completed', 'failed'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      updateData.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      if (!['stripe', 'paypal', 'card', 'cash', 'cod', 'qr'].includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      updateData.paymentMethod = paymentMethod;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user', 'name email').populate('items.product', 'name image price');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status', details: error.message });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics
// @access  Private (Admin)
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - numDays);

    // 1. Unique Customers
    const uniqueCustomers = await Order.distinct('user', {
      createdAt: { $gte: dateLimit },
      paymentStatus: { $in: ['completed', 'pending'] }
    });

    // 2. Stats & AOV
    const stats = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateLimit },
          paymentStatus: { $in: ['completed', 'pending'] }
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalOrders: { $sum: 1 }, 
          totalRevenue: { $sum: '$totalAmount' } 
        } 
      }
    ]);

    const totalOrders = stats[0]?.totalOrders || 0;
    const totalRevenue = stats[0]?.totalRevenue || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 3. Monthly Growth Calculation
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: currentMonthStart }, paymentStatus: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const prevMonthRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd }, paymentStatus: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const curRev = currentMonthRevenue[0]?.total || 0;
    const preRev = prevMonthRevenue[0]?.total || 0;
    const growth = preRev > 0 ? ((curRev - preRev) / preRev) * 100 : 100;

    // 4. Daily Activity (Daily Order Count and Revenue)
    const dailyActivity = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateLimit },
          paymentStatus: { $in: ['completed', 'pending'] }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orderCount: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 5. Top 5 Selling Products (Using stored fields now)
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: dateLimit }, paymentStatus: { $in: ['completed', 'pending'] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          category: { $first: "$items.category" },
          totalOrders: { $sum: 1 },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: "$_id",
          category: 1,
          totalOrders: 1,
          revenue: 1,
          rating: { $literal: 4.5 }
        }
      }
    ]);

    // 6. Category Sales Distribution (Using stored fields now)
    const categoryDistribution = await Order.aggregate([
      { $match: { createdAt: { $gte: dateLimit }, paymentStatus: { $in: ['completed', 'pending'] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.category",
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      }
    ]);

    // 7. Customer Insights
    const topCustomers = await Order.aggregate([
      { $match: { createdAt: { $gte: dateLimit }, paymentStatus: { $in: ['completed', 'pending'] } } },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "info"
        }
      },
      { $unwind: "$info" },
      {
        $project: {
          name: "$info.name",
          email: "$info.email",
          orderCount: 1,
          totalSpent: 1
        }
      }
    ]);

    // 8. Recent Orders
    const recentOrders = await Order.find({
      createdAt: { $gte: dateLimit }
    })
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      summary: {
        totalCustomers: uniqueCustomers.length,
        totalOrders,
        totalRevenue,
        avgOrderValue,
        growth: growth.toFixed(1)
      },
      dailyActivity,
      topProducts,
      categoryDistribution,
      topCustomers,
      recentOrders
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
});

// @route   GET /api/admin/sales-analytics
// @desc    Get comprehensive sales analytics
// @access  Private (Admin)
router.get('/sales-analytics', adminAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), period = '30' } = req.query;
    const currentYear = parseInt(year);
    
    // Date ranges
    const now = new Date();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    
    // For period filters (7, 30, 90 days)
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - parseInt(period));

    // 1. Monthly Sales & Orders (Jan - Dec)
    const monthlyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: { $in: ['completed', 'pending'] }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Fill missing months
    const fullMonthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlyStats.find(m => m._id === i + 1);
      return {
        month: new Date(0, i).toLocaleString('default', { month: 'short' }),
        revenue: monthData ? monthData.revenue : 0,
        orders: monthData ? monthData.orders : 0
      };
    });

    // 2. Summary Metrics
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const totalOrders = await Order.countDocuments({ paymentStatus: { $in: ['completed', 'pending'] } });
    const totalCustomers = await Order.distinct('user', { paymentStatus: { $in: ['completed', 'pending'] } });

    // Monthly Growth (Current vs Previous Month)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thisMonthStart }, paymentStatus: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const lastMonthRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, paymentStatus: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const growth = lastMonthRevenue[0]?.total > 0 
      ? ((thisMonthRevenue[0]?.total || 0) - lastMonthRevenue[0].total) / lastMonthRevenue[0].total * 100 
      : 100;

    // 3. Category Distribution
    const categoryStats = await Order.aggregate([
      { $match: { paymentStatus: { $in: ['completed', 'pending'] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.category",
          value: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      }
    ]);

    // 4. Sales Activity Map (Daily for the year or period)
    const salesActivity = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: periodStart },
          paymentStatus: { $in: ['completed', 'pending'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      monthlyData: fullMonthlyData,
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders,
        totalCustomers: totalCustomers.length,
        growth: growth.toFixed(1),
        currentMonthRevenue: thisMonthRevenue[0]?.total || 0
      },
      categoryData: categoryStats.map(c => ({ name: c._id, value: c.value })),
      activityData: salesActivity
    });
  } catch (error) {
    console.error('Sales Analytics error:', error);
    res.status(500).json({ message: 'Error fetching sales analytics' });
  }
});

module.exports = router;
