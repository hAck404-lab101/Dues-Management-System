const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/paid-students', authenticate, isAdmin, reportsController.getPaidStudents);
router.get('/defaulters', authenticate, isAdmin, reportsController.getDefaulters);
router.get('/revenue', authenticate, isAdmin, reportsController.getRevenueReport);
router.get('/export/:type', authenticate, isAdmin, reportsController.exportReport);

module.exports = router;

