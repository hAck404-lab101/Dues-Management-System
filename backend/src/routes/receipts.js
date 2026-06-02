const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');
const { authenticate } = require('../middleware/auth');
const { requireReceiptAccess } = require('../utils/accessControl');

// Public receipt verification returns metadata only, not the PDF file.
router.get('/number/:receiptNumber', receiptsController.getReceiptByNumber);

// Receipt PDF downloads must be authenticated and ownership-checked in the controller.
router.get('/download/:receiptNumber', authenticate, receiptsController.downloadReceipt);

router.get('/', authenticate, receiptsController.getReceipts);
router.get('/:id', authenticate, requireReceiptAccess, receiptsController.getReceiptById);

module.exports = router;
