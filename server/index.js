const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://mtp-9e6g.onrender.com',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({ 
  credentials: true, 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now - restrict in production
    }
  }
}));
app.use(express.json());
app.use(cookieParser());

// Trust proxy to get real IP address
app.set('trust proxy', true);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Adaptive Authentication API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      session: '/api/session',
      risk: '/api/risk'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/session', require('./routes/session'));
app.use('/api/risk', require('./routes/risk'));

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adaptive-auth';

// Validate MongoDB URI
if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv://')) {
  // Check if URI contains unencoded special characters
  if (process.env.MONGODB_URI.includes('%') && !process.env.MONGODB_URI.includes('%25')) {
    console.warn('⚠️  Warning: MongoDB URI may contain unencoded special characters.');
    console.warn('   If password contains %, it should be encoded as %25');
  }
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  console.log('   Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB Error:', err.message);
  if (err.message.includes('URI malformed')) {
    console.error('💡 Tip: Check your .env file - MONGODB_URI may have unencoded special characters.');
    console.error('   For local MongoDB, use: mongodb://localhost:27017/adaptive-auth');
    console.error('   For Atlas, ensure password special chars are URL-encoded (% -> %25)');
  }
  console.error('⚠️  Server will continue but database operations will fail!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});




