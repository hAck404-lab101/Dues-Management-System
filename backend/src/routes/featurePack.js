const express = require('express');
const router = express.Router();
const featurePackController = require('../controllers/featurePackController');
const { authenticate, isAdmin, isStudent, isFinancialSecretary } = require('../middleware/auth');

router.get('/admin/summary', authenticate, isAdmin, featurePackController.getAdminSummary);
router.get('/student/dues', authenticate, isStudent, featurePackController.getStudentDues);
router.get('/manual-payments/pending', authenticate, isFinancialSecretary, featurePackController.getManualPaymentQueue);
router.get('/payments/health', authenticate, isAdmin, featurePackController.getPaymentHealth);

module.exports = router;
