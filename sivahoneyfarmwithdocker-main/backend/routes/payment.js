const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const QRCode = require('qrcode');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/payment/create-intent
// @desc    Create Stripe payment intent
// @access  Private
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      metadata: {
        userId: req.user.id.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Error creating payment intent', error: error.message });
  }
});

// @route   POST /api/payment/verify
// @desc    Verify payment
// @access  Private
router.post('/verify', auth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      res.json({ 
        success: true, 
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
});

// @route   POST /api/payment/generate-qr
// @desc    Generate QR code for payment
// @access  Private
router.post('/generate-qr', auth, async (req, res) => {
  try {
    const { amount, orderId, upiId } = req.body;
    
    // Default UPI ID for demo purposes
    const paymentUpiId = upiId || 'sivahoney@paytm';
    
    // Create UPI payment string
    const upiString = `upi://pay?pa=${paymentUpiId}&pn=Siva%20Honey&am=${amount}&cu=INR&tn=Order%20${orderId}`;
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(upiString);
    
    res.json({
      qrCode: qrCodeDataUrl,
      upiId: paymentUpiId,
      amount: amount,
      orderId: orderId,
      upiString: upiString
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
});

module.exports = router;
