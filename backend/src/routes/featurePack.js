const express = require('express');
const router = express.Router();
const featurePackController = require('../controllers/featurePackController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

router.get('/admin/summary', authenticate, requirePermission('payments.view_all', 'dashboard.executive'), featurePackController.getAdminSummary);
router.get('/manual-payments/pending', authenticate, requirePermission('payments.approve', 'payments.record_manual', 'payments.view_all'), featurePackController.getManualPaymentQueue);
router.get('/payments/health', authenticate, requirePermission('payments.view_all'), featurePackController.getPaymentHealth);

module.exports = router;

