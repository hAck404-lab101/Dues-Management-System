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
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
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

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed'));
  }
});

// Paystack online-payment flow.
// initialize requires a signed-in student; verify and webhook remain public because
// Paystack redirects/webhooks can arrive independently of the user's app session.
router.post('/initialize', authenticate, paymentsController.initializePayment);
router.post('/verify', paystackController.verifyPayment);
router.post('/webhook', paystackController.handleWebhook);

// Manual/staff payment routes.
router.post('/manual', authenticate, requirePermission('payments.record_manual'), upload.single('proof'), paymentsController.createManualPayment);
router.get('/', authenticate, requirePermission('payments.view_all'), paymentsController.getPayments);
router.get('/:id', authenticate, requirePermission('payments.view_all'), paymentsController.getPaymentById);
router.patch('/:id/approve', authenticate, requirePermission('payments.approve'), auditLog('APPROVE_PAYMENT', 'payment'), paymentsController.approvePayment);
router.patch('/:id/reject', authenticate, requirePermission('payments.reject'), auditLog('REJECT_PAYMENT', 'payment'), paymentsController.rejectPayment);
router.post('/:id/resend-sms', authenticate, requirePermission('payments.resend_receipt'), auditLog('RESEND_SMS', 'payment'), paymentsController.resendSMSReceipt);
router.post('/:id/resend-email', authenticate, requirePermission('payments.resend_receipt'), auditLog('RESEND_EMAIL', 'payment'), paymentsController.resendEmailReceipt);

module.exports = router;
