const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const { authenticate, isAdmin, isStudent, isFinancialSecretary } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

router.post('/initialize', authenticate, isStudent, paymentsController.initializePayment);
router.post('/verify', authenticate, paymentsController.verifyPayment);
router.post('/webhook', paymentsController.handleWebhook);
router.post('/manual', authenticate, isStudent, upload.single('proof'), paymentsController.createManualPayment);
router.get('/', authenticate, paymentsController.getPayments);
router.get('/:id', authenticate, paymentsController.getPaymentById);
router.patch('/:id/approve', authenticate, isFinancialSecretary, auditLog('APPROVE_PAYMENT', 'payment'), paymentsController.approvePayment);
router.patch('/:id/reject', authenticate, isFinancialSecretary, auditLog('REJECT_PAYMENT', 'payment'), paymentsController.rejectPayment);
router.post('/:id/resend-sms', authenticate, isFinancialSecretary, auditLog('RESEND_SMS', 'payment'), paymentsController.resendSMSReceipt);
router.post('/:id/resend-email', authenticate, isFinancialSecretary, auditLog('RESEND_EMAIL', 'payment'), paymentsController.resendEmailReceipt);

module.exports = router;

