require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { pool } = require('./src/config/database');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/receipts', express.static(path.join(__dirname, 'receipts')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HTU Dues Management System API' });
});

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
    message: 'Route not found'
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
