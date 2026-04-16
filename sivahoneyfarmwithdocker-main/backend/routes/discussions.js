const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

// @route   GET /api/discussions/:productId
// @desc    Get all top-level comments for a product
router.get('/:productId', async (req, res) => {
  try {
    const comments = await Comment.find({ 
      product: req.params.productId,
      parentComment: null 
    })
    .sort({ createdAt: -1 });
    
    // Calculate average rating
    const ratings = await Comment.find({ 
      product: req.params.productId,
      rating: { $gt: 0 }
    });
    
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
      : 0;

    res.json({ comments, avgRating, totalReviews: ratings.length });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/discussions
// @desc    Post a new comment or review
router.post('/', auth, async (req, res) => {
  try {
    const { productId, message, rating, parentCommentId } = req.body;

    const newComment = new Comment({
      product: productId,
      user: req.user.id,
      userName: req.user.name,
      message,
      rating: rating || 0,
      parentComment: parentCommentId || null
    });

    const savedComment = await newComment.save();

    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: savedComment._id }
      });
    }

    res.json(savedComment);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/discussions/like/:id
// @desc    Like a comment
router.put('/like/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Check if already liked
    const index = comment.likes.indexOf(req.user.id);
    if (index === -1) {
      comment.likes.push(req.user.id);
    } else {
      comment.likes.splice(index, 1);
    }

    await comment.save();
    res.json(comment.likes);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   DELETE /api/discussions/:id
// @desc    Delete a comment (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // If it's a parent, we might want to handle replies. 
    // For simplicity, just delete the specific comment.
    await comment.deleteOne();
    res.json({ message: 'Comment removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/discussions/admin/all
// @desc    Get all comments for admin management
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;