const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');
const studentCredentialsController = require('../controllers/studentCredentialsController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { auditLog } = require('../middleware/auditLog');

router.get('/', authenticate, requirePermission('students.view'), studentsController.getAllStudents);
router.get('/:id', authenticate, requirePermission('students.view'), studentsController.getStudentById);
router.post('/', authenticate, requirePermission('students.edit'), auditLog('CREATE_STUDENT', 'student'), studentsController.createStudent);
router.put('/:id', authenticate, requirePermission('students.edit'), auditLog('UPDATE_STUDENT', 'student'), studentsController.updateStudent);
router.patch('/:id/reset-credentials', authenticate, requirePermission('students.edit'), auditLog('RESET_STUDENT_CREDENTIALS', 'student'), studentCredentialsController.resetStudentCredentials);
router.patch('/:id/activate', authenticate, requirePermission('students.edit'), auditLog('ACTIVATE_STUDENT', 'student'), studentsController.activateStudent);
router.patch('/:id/deactivate', authenticate, requirePermission('students.edit'), auditLog('DEACTIVATE_STUDENT', 'student'), studentsController.deactivateStudent);

router.delete('/bulk', authenticate, requirePermission('students.edit'), auditLog('BULK_DELETE_STUDENTS', 'student'), studentsController.bulkDeleteStudents);
router.delete('/:id', authenticate, requirePermission('students.edit'), auditLog('DELETE_STUDENT', 'student'), studentsController.deleteStudent);

module.exports = router;

