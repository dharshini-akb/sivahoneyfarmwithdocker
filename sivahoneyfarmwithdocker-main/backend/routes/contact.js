const express = require('express');
const { sendContactEmail } = require('../utils/emailService');
const router = express.Router();

// @route   POST /api/contact
// @desc    Send contact form message to admin
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const success = await sendContactEmail({ name, email, message });

    if (success) {
      res.status(200).json({ message: 'Message sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send message' });
    }
  } catch (error) {
    console.error('Contact route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
