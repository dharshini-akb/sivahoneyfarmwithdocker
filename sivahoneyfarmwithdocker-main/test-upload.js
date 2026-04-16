const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Test upload endpoint
app.post('/test-upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    message: 'File uploaded successfully!',
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    url: `http://localhost:${PORT}/uploads/${req.file.filename}`
  });
});

// List uploaded files
app.get('/test-files', (req, res) => {
  const fs = require('fs');
  const uploadDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    return res.json({ files: [] });
  }
  
  const files = fs.readdirSync(uploadDir);
  res.json({ 
    files: files.map(file => ({
      name: file,
      url: `http://localhost:${PORT}/uploads/${file}`
    }))
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Upload endpoint: POST http://localhost:${PORT}/test-upload`);
  console.log(`List files: GET http://localhost:${PORT}/test-files`);
});
