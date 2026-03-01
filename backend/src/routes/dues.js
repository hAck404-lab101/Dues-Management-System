const express = require('express');
const router = express.Router();
const duesController = require('../controllers/duesController');
const { authenticate, isAdmin, isStudent } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.get('/', authenticate, duesController.getAllDues);
router.get('/:id', authenticate, duesController.getDueById);
router.get('/:id/students', authenticate, isAdmin, duesController.getDueStudents);
router.post('/', authenticate, isAdmin, auditLog('CREATE_DUE', 'due'), duesController.createDue);
router.put('/:id', authenticate, isAdmin, auditLog('UPDATE_DUE', 'due'), duesController.updateDue);
router.post('/:id/assign', authenticate, isAdmin, auditLog('ASSIGN_DUE', 'due'), duesController.assignDue);
router.post('/:id/assign-bulk', authenticate, isAdmin, auditLog('BULK_ASSIGN_DUE', 'due'), duesController.bulkAssignDue);
router.patch('/:id/activate', authenticate, isAdmin, auditLog('ACTIVATE_DUE', 'due'), duesController.activateDue);
router.patch('/:id/deactivate', authenticate, isAdmin, auditLog('DEACTIVATE_DUE', 'due'), duesController.deactivateDue);
router.delete('/:id', authenticate, isAdmin, auditLog('DELETE_DUE', 'due'), duesController.deleteDue);

module.exports = router;

