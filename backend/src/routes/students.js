const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');
const studentCredentialsController = require('../controllers/studentCredentialsController');
const studentStatusController = require('../controllers/studentStatusController');
const studentSelfController = require('../controllers/studentSelfController');
const { authenticate, authorize } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { auditLog } = require('../middleware/auditLog');

// Student self-service routes must be registered before /:id.
router.get('/me', authenticate, studentSelfController.getMyProfile);
router.patch('/me', authenticate, studentSelfController.updateMyProfile);

router.get('/', authenticate, requirePermission('students.view'), studentsController.getAllStudents);
router.get('/:id', authenticate, requirePermission('students.view'), studentsController.getStudentById);
router.post('/', authenticate, requirePermission('students.edit'), auditLog('CREATE_STUDENT', 'student'), studentsController.createStudent);
router.put('/:id', authenticate, requirePermission('students.edit'), auditLog('UPDATE_STUDENT', 'student'), studentsController.updateStudent);

// The restored admin Students page exposes Reset Login to all staff-side roles
// that can enter the page. Keep the backend authorization aligned with that UI.
router.patch(
  '/:id/reset-credentials',
  authenticate,
  authorize('admin', 'president', 'treasurer', 'financial_secretary'),
  auditLog('RESET_STUDENT_CREDENTIALS', 'student'),
  studentCredentialsController.resetStudentCredentials
);

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
