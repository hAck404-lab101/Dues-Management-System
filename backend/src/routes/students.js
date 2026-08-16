const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');
const studentCredentialsController = require('../controllers/studentCredentialsController');
const studentStatusController = require('../controllers/studentStatusController');
const { authenticate, authorize } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { auditLog } = require('../middleware/auditLog');

router.get('/', authenticate, requirePermission('students.view'), studentsController.getAllStudents);
router.get('/:id', authenticate, requirePermission('students.view'), studentsController.getStudentById);
router.post('/', authenticate, requirePermission('students.edit'), auditLog('CREATE_STUDENT', 'student'), studentsController.createStudent);
router.put('/:id', authenticate, requirePermission('students.edit'), auditLog('UPDATE_STUDENT', 'student'), studentsController.updateStudent);
router.patch('/:id/reset-credentials', authenticate, requirePermission('students.edit'), auditLog('RESET_STUDENT_CREDENTIALS', 'student'), studentCredentialsController.resetStudentCredentials);

// Legacy frontend compatibility: the restored admin UI treats all staff-side roles
// as admin users and exposes Activate/Deactivate to them. Keep these two status
// actions aligned with that UI while leaving the rest of students.edit RBAC intact.
router.patch(
  '/:id/activate',
  authenticate,
  authorize('admin', 'president', 'treasurer', 'financial_secretary'),
  auditLog('ACTIVATE_STUDENT', 'student'),
  studentStatusController.activateStudent
);
router.patch(
  '/:id/deactivate',
  authenticate,
  authorize('admin', 'president', 'treasurer', 'financial_secretary'),
  auditLog('DEACTIVATE_STUDENT', 'student'),
  studentStatusController.deactivateStudent
);

router.delete('/bulk', authenticate, requirePermission('students.edit'), auditLog('BULK_DELETE_STUDENTS', 'student'), studentsController.bulkDeleteStudents);
router.delete('/:id', authenticate, requirePermission('students.edit'), auditLog('DELETE_STUDENT', 'student'), studentsController.deleteStudent);

module.exports = router;
