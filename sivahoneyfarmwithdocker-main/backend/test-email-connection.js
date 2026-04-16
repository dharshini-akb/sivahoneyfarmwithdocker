const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.log('Testing SMTP connection for:', process.env.EMAIL_USER);

transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
    process.exit(1);
  } else {
    console.log('SMTP Connection Successful! Server is ready to take our messages.');
    process.exit(0);
  }
});
