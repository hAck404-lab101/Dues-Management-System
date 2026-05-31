const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');
const { authenticate } = require('../middleware/auth');

// Public receipt verification must come before dynamic /:id route
router.get('/number/:receiptNumber', receiptsController.getReceiptByNumber);
router.get('/', authenticate, receiptsController.getReceipts);
router.get('/:id', authenticate, receiptsController.getReceiptById);

module.exports = router;
