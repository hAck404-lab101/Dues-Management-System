const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

// Public receipt verification returns metadata only, not the PDF file.
router.get('/number/:receiptNumber', receiptsController.getReceiptByNumber);

// Receipt PDF downloads must be authenticated and ownership-checked in the controller.
router.get('/download/:receiptNumber', authenticate, requirePermission('payments.view_all'), receiptsController.downloadReceipt);

router.get('/', authenticate, requirePermission('payments.view_all'), receiptsController.getReceipts);
router.get('/:id', authenticate, requirePermission('payments.view_all'), receiptsController.getReceiptById);

module.exports = router;

