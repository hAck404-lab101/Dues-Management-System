const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');
const { authenticate } = require('../middleware/auth');

// Public receipt verification returns metadata only, not the PDF file.
router.get('/number/:receiptNumber', receiptsController.getReceiptByNumber);

// Authenticated receipt routes rely on controller ownership checks for students.
router.get('/download/:receiptNumber', authenticate, receiptsController.downloadReceipt);
router.get('/', authenticate, receiptsController.getReceipts);
router.get('/:id', authenticate, receiptsController.getReceiptById);

module.exports = router;
