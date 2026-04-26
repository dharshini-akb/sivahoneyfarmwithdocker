const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

// @route   GET /api/discussions/:productId
// @desc    Get all top-level comments for a product
router.get('/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    console.log('Fetching discussions for productId:', productId);
    
    // Use the productId directly (could be ObjectId or string for filesystem products)
    const comments = await Comment.find({ 
      product: productId,
      parentComment: null 
    })
    .sort({ createdAt: -1 });

    // Recursively populate replies
    const populateReplies = async (commentList) => {
      return await Promise.all(commentList.map(async (comment) => {
        const commentObj = comment.toObject();
        if (comment.replies && comment.replies.length > 0) {
          const replies = await Comment.find({ _id: { $in: comment.replies } }).sort({ createdAt: 1 });
          commentObj.replies = await populateReplies(replies);
        } else {
          commentObj.replies = [];
        }
        return commentObj;
      }));
    };

    const populatedComments = await populateReplies(comments);
    
    // Calculate average rating
    const ratings = await Comment.find({ 
      product: productId,
      rating: { $gt: 0 }
    });
    
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
      : 0;

    res.json({ comments: populatedComments, avgRating, totalReviews: ratings.length });
  } catch (err) {
    console.error('Discussions GET error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/discussions
// @desc    Post a new comment or review
router.post('/', auth, async (req, res) => {
  try {
    const { productId, message, rating, parentCommentId } = req.body;
    console.log('POST discussion:', { productId, message, rating, parentCommentId });

    if (!productId || !message) {
      return res.status(400).json({ message: 'Product ID and message are required' });
    }

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
    console.error('Discussions POST error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
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
      .sort({ createdAt: -1 });
    
    // Manually populate product names for filesystem products
    const populatedComments = await Promise.all(comments.map(async (comment) => {
      const commentObj = comment.toObject();
      if (comment.product && comment.product.toString().startsWith('fs_')) {
        // Mock product object for filesystem products
        const filename = comment.product.toString().replace(/^fs_\d+_/, '');
        commentObj.product = {
          _id: comment.product,
          name: filename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        };
      } else if (comment.product && mongoose.Types.ObjectId.isValid(comment.product)) {
        // Try to find in DB
        const product = await Product.findById(comment.product).select('name');
        if (product) {
          commentObj.product = product;
        }
      }
      return commentObj;
    }));

    res.json(populatedComments);
  } catch (err) {
    console.error('Admin discussions GET error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;