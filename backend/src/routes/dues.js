const express = require('express');
const router = express.Router();
const duesController = require('../controllers/duesController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

router.get('/', authenticate, requirePermission('dues.create', 'dues.edit', 'dues.view'), duesController.getAllDues);
router.get('/:id', authenticate, requirePermission('dues.create', 'dues.edit', 'dues.view'), duesController.getDueById);
router.get('/:id/students', authenticate, requirePermission('dues.view', 'dues.edit'), duesController.getDueStudents);
router.post('/', authenticate, requirePermission('dues.create'), duesController.createDue);
router.patch('/:id', authenticate, requirePermission('dues.edit'), duesController.updateDue);
router.get('/:id/price-history', authenticate, requirePermission('dues.edit'), duesController.getPriceHistory);
router.post('/:id/reprice-unpaid', authenticate, requirePermission('dues.edit'), duesController.repriceUnpaid);
router.post('/:id/assign', authenticate, requirePermission('dues.assign'), duesController.assignDue);
router.delete('/:id', authenticate, requirePermission('dues.edit'), duesController.deleteDue);

module.exports = router;


