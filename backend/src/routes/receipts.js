const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, receiptsController.getReceipts);
router.get('/:id', authenticate, receiptsController.getReceiptById);
router.get('/number/:receiptNumber', receiptsController.getReceiptByNumber);

module.exports = router;

