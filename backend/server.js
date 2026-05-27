require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { pool } = require('./src/config/database');

const app = express();
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS setup
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://dues-management-system-phi.vercel.app',
  'https://uewdept.org',
  'https://www.uewdept.org',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin, like Postman, curl, or direct browser API visits
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('Blocked by CORS:', origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HTU Dues Management System API is running',
    status: 'online',
    health: '/health',
    api: '/api'
  });
});

// API info route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'HTU Dues Management System API',
    availableRoutes: {
      auth: '/api/auth',
      students: '/api/students',
      dues: '/api/dues',
      payments: '/api/payments',
      receipts: '/api/receipts',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      admin: '/api/admin',
      settings: '/api/settings'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'HTU Dues Management System API is healthy'
  });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/receipts', express.static(path.join(__dirname, 'receipts')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/students', require('./src/routes/students'));
app.use('/api/dues', require('./src/routes/dues'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/receipts', require('./src/routes/receipts'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/settings', require('./src/routes/settings'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
pool.getConnection()
  .then((connection) => {
    console.log('Database connected successfully');
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

module.exports = app;
