const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const paystackController = require('../controllers/paystackController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { auditLog } = require('../middleware/auditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image and PDF files are allowed'));
  }
});

// Paystack online-payment flow.
router.post('/initialize', authenticate, paymentsController.initializePayment);
router.post('/verify', paystackController.verifyPayment);
router.post('/webhook', paystackController.handleWebhook);

// Student self-service payment actions. Controllers enforce ownership for student users.
router.post('/manual', authenticate, upload.single('proof'), paymentsController.createManualPayment);
router.get('/', authenticate, paymentsController.getPayments);
router.get('/:id', authenticate, paymentsController.getPaymentById);
router.post('/:id/resend-sms', authenticate, paymentsController.resendSMSReceipt);
router.post('/:id/resend-email', authenticate, paymentsController.resendEmailReceipt);

// Staff-only approval actions remain permission protected.
router.patch('/:id/approve', authenticate, requirePermission('payments.approve'), auditLog('APPROVE_PAYMENT', 'payment'), paymentsController.approvePayment);
router.patch('/:id/reject', authenticate, requirePermission('payments.reject'), auditLog('REJECT_PAYMENT', 'payment'), paymentsController.rejectPayment);

module.exports = router;
