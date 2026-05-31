const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');
const { authenticate } = require('../middleware/auth');
const { requireReceiptAccess } = require('../utils/accessControl');

// Public receipt verification must come before dynamic /:id route
router.get('/number/:receiptNumber', receiptsController.getReceiptByNumber);
router.get('/', authenticate, receiptsController.getReceipts);
router.get('/:id', authenticate, requireReceiptAccess, receiptsController.getReceiptById);

module.exports = router;
