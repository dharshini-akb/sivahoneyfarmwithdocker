const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sivahoneyform');
    console.log('Connected to MongoDB');

    const email = process.argv[2] || 'admin@sivahoneyform.com';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Admin user already exists. Updating password and role...');
      existingAdmin.role = 'admin';
      existingAdmin.password = password; // This will be hashed by the pre-save hook in User model
      await existingAdmin.save();
      console.log('Admin user updated successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      process.exit(0);
    }

    // Create new admin
    const admin = new User({
      name,
      email,
      password,
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\nPlease change the password after first login!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
