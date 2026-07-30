const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

router.get('/paid-students', authenticate, requirePermission('reports.export'), reportsController.getPaidStudents);
router.get('/defaulters', authenticate, requirePermission('reports.export'), reportsController.getDefaulters);
router.get('/revenue', authenticate, requirePermission('reports.export'), reportsController.getRevenueReport);
router.get('/export/:type', authenticate, requirePermission('reports.export'), reportsController.exportReport);

module.exports = router;


