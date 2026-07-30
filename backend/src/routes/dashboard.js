const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

router.get('/admin', authenticate, requirePermission('dashboard.executive', 'payments.view_all'), dashboardController.getAdminDashboard);

module.exports = router;


