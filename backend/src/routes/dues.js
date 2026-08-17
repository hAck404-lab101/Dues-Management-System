const express = require('express');
const router = express.Router();
const duesController = require('../controllers/duesController');
const studentDuesController = require('../controllers/studentDuesController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

const staffDuesRead = requirePermission('dues.create', 'dues.edit', 'dues.view');

router.get('/', authenticate, (req, res, next) => {
  if (req.user.role === 'student') return studentDuesController.getAssignedDues(req, res);
  return staffDuesRead(req, res, next);
}, duesController.getAllDues);

router.get('/:id', authenticate, (req, res, next) => {
  if (req.user.role === 'student') return studentDuesController.getAssignedDueById(req, res);
  return staffDuesRead(req, res, next);
}, duesController.getDueById);

router.get('/:id/students', authenticate, requirePermission('dues.view', 'dues.edit'), duesController.getDueStudents);
router.post('/', authenticate, requirePermission('dues.create'), duesController.createDue);
router.patch('/:id', authenticate, requirePermission('dues.edit'), duesController.updateDue);
router.put('/:id', authenticate, requirePermission('dues.edit'), duesController.updateDue);
router.patch('/:id/activate', authenticate, requirePermission('dues.edit'), duesController.activateDue);
router.patch('/:id/deactivate', authenticate, requirePermission('dues.edit'), duesController.deactivateDue);
router.get('/:id/price-history', authenticate, requirePermission('dues.edit'), duesController.getPriceHistory);
router.post('/:id/reprice-unpaid', authenticate, requirePermission('dues.edit'), duesController.repriceUnpaid);
router.post('/:id/assign', authenticate, requirePermission('dues.assign'), duesController.assignDue);
router.post('/:id/assign-bulk', authenticate, requirePermission('dues.assign'), duesController.assignDue);
router.delete('/:id', authenticate, requirePermission('dues.edit'), duesController.deleteDue);

module.exports = router;
