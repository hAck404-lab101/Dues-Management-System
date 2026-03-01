const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/student', authenticate, dashboardController.getStudentDashboard);
router.get('/admin', authenticate, dashboardController.getAdminDashboard);

module.exports = router;

