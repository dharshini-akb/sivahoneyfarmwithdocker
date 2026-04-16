# Setup Guide for Siva Honey Form

## Quick Start

### 1. Install Dependencies

From the root directory:
```bash
npm install
cd backend && npm install && cd ../frontend && npm install
```

### 2. Setup MongoDB

Make sure MongoDB is running on your system. You can use:
- Local MongoDB installation
- MongoDB Atlas (cloud)

### 3. Configure Environment Variables

#### Backend (.env file in `backend/` folder)

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sivahoneyform
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRE=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=admin@sivahoneyform.com

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Note for Gmail:**
- Enable 2-factor authentication
- Generate an App Password: https://myaccount.google.com/apppasswords
- Use the app password in EMAIL_PASS

**Note for Stripe:**
- Sign up at https://stripe.com
- Get your test keys from the dashboard
- For production, use live keys

#### Frontend (.env file in `frontend/` folder)

Create `frontend/.env`:
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
REACT_APP_API_URL=http://localhost:5000
```

### 4. Create Admin User

After starting the application:

1. Register a user through the frontend at `/register`
2. Connect to MongoDB and update the user role:
```javascript
// Using MongoDB shell or Compass
use sivahoneyform
db.users.updateOne(
  { email: "your_admin_email@example.com" },
  { $set: { role: "admin" } }
)
```

Or create a script `backend/createAdmin.js`:
```javascript
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const admin = new User({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });
    await admin.save();
    console.log('Admin created successfully');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
```

Run: `node backend/createAdmin.js`

### 5. Start the Application

#### Option 1: Run both servers together
```bash
npm run dev
```

#### Option 2: Run separately

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm start
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Admin Login: http://localhost:3000/admin/login
- User Login: http://localhost:3000/login

## Testing Payment

For Stripe test payments, use these test card numbers:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Any future expiry date and any CVC

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- For Atlas, ensure IP is whitelisted

### Email Not Sending
- Verify Gmail app password is correct
- Check EMAIL_USER and EMAIL_PASS in .env
- Ensure 2FA is enabled on Gmail account

### Payment Not Working
- Verify Stripe keys are correct
- Check REACT_APP_STRIPE_PUBLISHABLE_KEY in frontend .env
- Ensure using test keys for development

### Image Upload Issues
- Ensure `backend/uploads/` directory exists
- Check file permissions
- Verify multer configuration

## Production Deployment

1. Set NODE_ENV=production
2. Use production MongoDB URI
3. Use Stripe live keys
4. Configure proper email service
5. Set up proper file storage (AWS S3, Cloudinary, etc.)
6. Use environment variables for all sensitive data
7. Enable HTTPS
8. Set up proper error logging and monitoring
