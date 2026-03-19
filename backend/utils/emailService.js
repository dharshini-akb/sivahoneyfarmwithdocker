const nodemailer = require('nodemailer');
const Order = require('../models/Order');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Debug log to check if environment variables are loaded (excluding actual password for security)
console.log('Email configuration check:');
console.log('- EMAIL_USER:', process.env.EMAIL_USER ? 'Found' : 'MISSING');
console.log('- EMAIL_PASS:', process.env.EMAIL_PASS ? 'Found' : 'MISSING');
console.log('- ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? 'Found' : 'MISSING');
console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Found' : 'MISSING');

const hasResend = !!process.env.RESEND_API_KEY;

const sendViaResend = async ({ from, to, subject, html }) => {
  const payload = {
    from,
    to,
    subject,
    html
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let details = '';
    try {
      details = await res.text();
    } catch (e) {
      details = '';
    }
    throw new Error(`Resend API error: ${res.status}${details ? ` - ${details}` : ''}`);
  }

  return res.json();
};

// Create transporter with Gmail service configuration (Recommended for Gmail)
const transporter = (!hasResend && process.env.EMAIL_USER && process.env.EMAIL_PASS)
  ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Necessary for some local environments
    }
  })
  : null;

// Verify connection configuration
if (transporter) {
  transporter.verify(function (error, success) {
    if (error) {
      console.error('SMTP Connection Error Details:', error);
    } else {
      console.log('SMTP Server is ready to take our messages');
    }
  });
}

// Send order notification email to admin
const sendOrderEmail = async (order) => {
  try {
    // Populate order details
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name price');

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    const itemsList = populatedOrder.items.map(item => 
      `- ${item.product.name} (Qty: ${item.quantity}) - Rs.${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const mailOptions = {
      from: `"Siva Honey Form" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `New Order Received - Order #${order._id.toString().slice(-6)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #8B4513; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">New Order Notification</h1>
          </div>
          <div style="padding: 20px;">
            <p>You have received a new order from Siva Honey Form.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Order Details:</h3>
              <p><strong>Order ID:</strong> #${order._id.toString().toUpperCase()}</p>
              <p><strong>Customer:</strong> ${populatedOrder.user.name} (${populatedOrder.user.email})</p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
              <p><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
              <p><strong>Total Amount:</strong> Rs.${order.totalAmount.toFixed(2)}</p>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Order Items:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #ddd;">
                    <th style="text-align: left; padding: 8px;">Product</th>
                    <th style="text-align: center; padding: 8px;">Qty</th>
                    <th style="text-align: right; padding: 8px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${populatedOrder.items.map(item => `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 8px;">${item.product.name}</td>
                      <td style="text-align: center; padding: 8px;">${item.quantity}</td>
                      <td style="text-align: right; padding: 8px;">Rs.${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Shipping Information:</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${order.shippingInfo.name}</p>
              <p style="margin: 5px 0;"><strong>Address:</strong> ${order.shippingInfo.address}</p>
              <p style="margin: 5px 0;"><strong>City:</strong> ${order.shippingInfo.city}</p>
              <p style="margin: 5px 0;"><strong>State:</strong> ${order.shippingInfo.state} - ${order.shippingInfo.zipCode}</p>
              <p style="margin: 5px 0;"><strong>Country:</strong> ${order.shippingInfo.country}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.shippingInfo.phone}</p>
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
              Please log in to your admin dashboard to process this order.
            </p>
          </div>
          <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} Siva Honey Form. All rights reserved.
          </div>
        </div>
      `
    };

    try {
      const fromAddress = process.env.RESEND_FROM || process.env.EMAIL_USER;
      if (hasResend) {
        await sendViaResend({
          from: `Siva Honey Form <${fromAddress}>`,
          to: adminEmail,
          subject: mailOptions.subject,
          html: mailOptions.html
        });
      } else if (transporter) {
        await transporter.sendMail(mailOptions);
      } else {
        throw new Error('No email provider configured');
      }
      console.log('Order notification email sent to admin successfully');
    } catch (adminError) {
      console.error('Failed to send admin notification:', adminError.message);
    }
    
    // Send confirmation email to user as well
    await sendUserOrderConfirmation(populatedOrder);
    
  } catch (error) {
    console.error('Error sending order email:', error);
    // Don't throw, just log to prevent order process from breaking
  }
};

// Send order confirmation email to the customer
const sendUserOrderConfirmation = async (order) => {
  try {
    const mailOptions = {
      from: `"Siva Honey Form" <${process.env.EMAIL_USER}>`,
      to: order.user.email,
      subject: `Order Confirmation - Order #${order._id.toString().slice(-6).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #8B4513; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Thank You for Your Order!</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hello ${order.user.name},</p>
            <p>Your order has been placed successfully. We are getting it ready for you!</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Order Summary:</h3>
              <p><strong>Order ID:</strong> #${order._id.toString().toUpperCase()}</p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> Rs.${order.totalAmount.toFixed(2)}</p>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Items Ordered:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #ddd;">
                    <th style="text-align: left; padding: 8px;">Product</th>
                    <th style="text-align: center; padding: 8px;">Qty</th>
                    <th style="text-align: right; padding: 8px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map(item => `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 8px;">${item.product.name}</td>
                      <td style="text-align: center; padding: 8px;">${item.quantity}</td>
                      <td style="text-align: right; padding: 8px;">Rs.${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Shipping to:</h3>
              <p style="margin: 5px 0;">sivahoneyfarm, panapalayam,</p>
              <p style="margin: 5px 0;">thamaraipalayam(p.o), unjalur via,</p>
              <p style="margin: 5px 0;">Erode D.T.</p>
            </div>

            <p>You can track your order status in your <a href="${process.env.FRONTEND_URL}/orders" style="color: #8B4513; text-decoration: underline;">Order History</a>.</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, please contact us at <a href="mailto:sivabeefarm@gmail.com" style="color: #8B4513;">sivabeefarm@gmail.com</a>.
            </p>
          </div>
          <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} Siva Honey Form. All rights reserved.
          </div>
        </div>
      `
    };

    const fromAddress = process.env.RESEND_FROM || process.env.EMAIL_USER;
    if (hasResend) {
      await sendViaResend({
        from: `Siva Honey Form <${fromAddress}>`,
        to: order.user.email,
        subject: mailOptions.subject,
        html: mailOptions.html
      });
    } else if (transporter) {
      await transporter.sendMail(mailOptions);
    } else {
      throw new Error('No email provider configured');
    }
    console.log(`Order confirmation email sent to customer: ${order.user.email}`);
  } catch (error) {
    console.error('Failed to send user confirmation email:', error.message);
  }
};

// Send contact form message to admin
const sendContactEmail = async (contactData) => {
  try {
    const { name, email, message } = contactData;
    
    const mailOptions = {
      from: `"Siva Honey Form Contact" <${process.env.EMAIL_USER}>`,
      to: "dharshiniakb@gmail.com",
      subject: `New Contact Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #8B4513; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">New Contact Message</h1>
          </div>
          <div style="padding: 20px;">
            <p>You have received a new message from your website contact form.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Sender Details:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Message:</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
          </div>
          <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} Siva Honey Form. All rights reserved.
          </div>
        </div>
      `
    };

    const fromAddress = process.env.RESEND_FROM || process.env.EMAIL_USER;
    if (hasResend) {
      await sendViaResend({
        from: `Siva Honey Form <${fromAddress}>`,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      });
    } else if (transporter) {
      await transporter.sendMail(mailOptions);
    } else {
      throw new Error('No email provider configured');
    }
    console.log(`Contact message email sent to admin from: ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send contact email:', error.message);
    return false;
  }
};

module.exports = { sendOrderEmail, sendUserOrderConfirmation, sendContactEmail };
