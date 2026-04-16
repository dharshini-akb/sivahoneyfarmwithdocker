const nodemailer = require('nodemailer');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('[EmailService] Initializing with user:', process.env.EMAIL_USER);

// Create transporter with Gmail service configuration and pooling enabled
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error('[EmailService] ERROR: EMAIL_USER or EMAIL_PASS not found in environment');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    pool: true, // Use pooling for multiple emails
    maxConnections: 3,
    maxMessages: 10,
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const transporter = createTransporter();

if (transporter) {
  transporter.verify(function (error, success) {
    if (error) {
      console.error('[EmailService] SMTP Connection Error Details:', error);
    } else {
      console.log('[EmailService] SMTP Server is ready to take our messages');
    }
  });
}

/**
 * Sends order notification email to admin and confirmation to user.
 */
const sendOrderEmail = async (orderId) => {
  console.log(`[EmailService] Attempting to send order email for ID: ${orderId}`);
  try {
    if (!transporter) {
      throw new Error('Transporter not initialized');
    }

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product', 'name price');

    if (!order) {
      console.error(`[EmailService] ERROR: Order with ID ${orderId} not found`);
      return;
    }

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const customerEmail = order.user?.email;
    
    console.log(`[EmailService] Preparing emails. Admin: ${adminEmail}, Customer: ${customerEmail || 'N/A'}`);

    const itemsTable = order.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px;">${item.product ? item.product.name : (item.name || 'Product Removed')}</td>
        <td style="text-align: center; padding: 8px;">${item.quantity}</td>
        <td style="text-align: right; padding: 8px;">Rs.${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const emailStyle = `
      font-family: Arial, sans-serif; 
      max-width: 600px; 
      margin: 0 auto; 
      border: 1px solid #ddd; 
      border-radius: 10px; 
      overflow: hidden;
    `;

    // 1. Admin Notification Options
    const adminMailOptions = {
      from: `"BIOBASKET" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `New Order Received - Order #${order._id.toString().slice(-6).toUpperCase()}`,
      html: `
        <div style="${emailStyle}">
          <div style="background-color: #8B4513; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">New Order Notification</h1>
          </div>
          <div style="padding: 20px;">
            <p>You have received a new order from BIOBASKET.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513; margin-top: 0;">Order Details:</h3>
              <p><strong>Order ID:</strong> #${order._id.toString().toUpperCase()}</p>
              <p><strong>Customer:</strong> ${order.user?.name || 'Guest'} (${customerEmail || 'N/A'})</p>
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
                <tbody>${itemsTable}</tbody>
              </table>
            </div>
          </div>
        </div>
      `
    };

    // 2. User Confirmation Options (if email exists)
    let userMailOptions = null;
    if (customerEmail) {
      userMailOptions = {
        from: `"BIOBASKET" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `Order Confirmation - Order #${order._id.toString().slice(-6).toUpperCase()}`,
        html: `
          <div style="${emailStyle}">
            <div style="background-color: #8B4513; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Thank You for Your Order!</h1>
            </div>
            <div style="padding: 20px;">
              <p>Hello ${order.user?.name || 'Valued Customer'},</p>
              <p>Your order has been placed successfully. We are preparing it for you!</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #8B4513; margin-top: 0;">Order Summary:</h3>
                <p><strong>Order ID:</strong> #${order._id.toString().toUpperCase()}</p>
                <p><strong>Total Amount:</strong> Rs.${order.totalAmount.toFixed(2)}</p>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #ddd;">
                    <th style="text-align: left; padding: 8px;">Product</th>
                    <th style="text-align: center; padding: 8px;">Qty</th>
                    <th style="text-align: right; padding: 8px;">Price</th>
                  </tr>
                </thead>
                <tbody>${itemsTable}</tbody>
              </table>
              <p style="margin-top: 20px;">We'll notify you when your order is on its way.</p>
            </div>
          </div>
        `
      };
    }

    // Send emails
    const sendPromises = [];
    
    // Always send admin notification
    console.log(`[EmailService] Queuing admin notification...`);
    sendPromises.push(transporter.sendMail(adminMailOptions).then(res => {
      console.log(`[EmailService] Admin notification sent: ${res.messageId}`);
      return { success: true, type: 'admin', id: res.messageId };
    }).catch(err => {
      console.error(`[EmailService] Admin notification FAILED:`, err.message);
      return { success: false, type: 'admin', error: err.message };
    }));

    // Send customer confirmation if available
    if (userMailOptions) {
      console.log(`[EmailService] Queuing customer confirmation...`);
      sendPromises.push(transporter.sendMail(userMailOptions).then(res => {
        console.log(`[EmailService] Customer confirmation sent: ${res.messageId}`);
        return { success: true, type: 'customer', id: res.messageId };
      }).catch(err => {
        console.error(`[EmailService] Customer confirmation FAILED:`, err.message);
        return { success: false, type: 'customer', error: err.message };
      }));
    }

    const results = await Promise.all(sendPromises);
    
    // If at least one succeeded, mark as emailSent
    if (results.some(r => r.success)) {
      order.emailSent = true;
      await order.save();
      console.log(`[EmailService] Order updated with emailSent = true`);
    }

  } catch (error) {
    console.error('[EmailService] CRITICAL ERROR (sendOrderEmail):', error);
  }
};

const sendContactEmail = async (contactData) => {
  console.log(`[EmailService] Attempting to send contact email from: ${contactData.email}`);
  try {
    if (!transporter) {
      throw new Error('Transporter not initialized');
    }

    const { name, email, message } = contactData;
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "dharshiniakb@gmail.com";
    
    const mailOptions = {
      from: `"BIOBASKET Contact" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `New Contact Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #8B4513; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">New Contact Message</h1>
          </div>
          <div style="padding: 20px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</p>
          </div>
        </div>
      `
    };

    const contactResult = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Contact email sent successfully: ${contactResult.messageId}`);
    return true;
  } catch (error) {
    console.error('[EmailService] ERROR (sendContactEmail):', error, error.stack);
    return false;
  }
};

module.exports = { sendOrderEmail, sendContactEmail };
