require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const compression = require('compression');
const { pool } = require('./src/config/database');
const { repairDuesTables } = require('./src/utils/repairDuesTables');

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security and performance middleware
app.use(helmet());
app.use(compression());

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
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log('Blocked by CORS:', origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Paystack-Signature']
}));

app.use(express.json({
  limit: process.env.JSON_BODY_LIMIT || '2mb',
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/payments/webhook') {
      req.rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '2mb' }));

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dues Management System API is running',
    status: 'online',
    health: '/health',
    api: '/api'
  });
});

// API info route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Dues Management System API',
    availableRoutes: {
      auth: '/api/auth',
      students: '/api/students',
      dues: '/api/dues',
      payments: '/api/payments',
      receipts: '/api/receipts',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      admin: '/api/admin',
      settings: '/api/settings',
      features: '/api/features'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, status: 'ok', message: 'Dues Management System API is healthy' });
});

// Keep payment proofs private. Use /api/protected-uploads/:filename with auth checks instead.
app.use('/receipts', express.static(path.join(__dirname, 'receipts'), { maxAge: '1h', etag: true }));

// Rate limiting tuned for production traffic. Override with env vars as traffic grows.
const generalLimiter = rateLimit({
  windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseNumber(process.env.RATE_LIMIT_MAX, 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' }
});

const authLimiter = rateLimit({
  windowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

const sensitiveLimiter = rateLimit({
  windowMs: parseNumber(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseNumber(process.env.SENSITIVE_RATE_LIMIT_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sensitive requests. Please try again later.' }
});

const paymentLimiter = rateLimit({
  windowMs: parseNumber(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseNumber(process.env.PAYMENT_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many payment requests. Please try again later.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', sensitiveLimiter);
app.use('/api/auth/verify-otp', sensitiveLimiter);
app.use('/api/auth/reset-password', sensitiveLimiter);
app.use('/api/auth/refresh', sensitiveLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api/', generalLimiter);

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/students', require('./src/routes/students'));
app.use('/api/dues', require('./src/routes/dues'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/protected-uploads', require('./src/routes/protectedUploads'));
app.use('/api/receipts', require('./src/routes/receipts'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/features', require('./src/routes/featurePack'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.originalUrl });
});

const PORT = process.env.PORT || 5000;

pool.getConnection()
  .then(async (connection) => {
    console.log('Database connected successfully');

    try {
      await repairDuesTables(connection);
    } catch (repairError) {
      console.error('Dues table repair warning:', repairError.message);
      console.error('Server will still start, but dues may fail until the schema is fixed.');
    } finally {
      connection.release();
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.keepAliveTimeout = parseNumber(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS, 65000);
    server.headersTimeout = parseNumber(process.env.SERVER_HEADERS_TIMEOUT_MS, 66000);
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

module.exports = app;
