const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { sendOrderEmail } = require('./utils/emailService');

const orderId = '69b98b8111a98fa8e618bae4';

async function test() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Calling sendOrderEmail...');
    await sendOrderEmail(orderId);
    console.log('Test completed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();
