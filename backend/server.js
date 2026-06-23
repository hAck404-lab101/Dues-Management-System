require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { pool } = require('./src/config/database');
const { repairDuesTables } = require('./src/utils/repairDuesTables');

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.PUBLIC_APP_URL,
  'https://uewdept.org',
  'https://www.uewdept.org',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '2mb' }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'DuesPay API is running', status: 'online', health: '/health', api: '/api' });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'DuesPay API',
    availableRoutes: {
      auth: '/api/auth', students: '/api/students', dues: '/api/dues', payments: '/api/payments', receipts: '/api/receipts', dashboard: '/api/dashboard', reports: '/api/reports', admin: '/api/admin', settings: '/api/settings', features: '/api/features'
    }
  });
});

app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, status: 'ok', message: 'DuesPay API is healthy' });
});

// Proof uploads can remain public enough for admin previews, but receipt PDFs must go through authenticated API routes.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1h', etag: true }));

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
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', generalLimiter);

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/students', require('./src/routes/students'));
app.use('/api/dues', require('./src/routes/dues'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/receipts', require('./src/routes/receipts'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/features', require('./src/routes/featurePack'));

app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error', ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
});

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
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    server.keepAliveTimeout = parseNumber(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS, 65000);
    server.headersTimeout = parseNumber(process.env.SERVER_HEADERS_TIMEOUT_MS, 66000);
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

module.exports = app;
