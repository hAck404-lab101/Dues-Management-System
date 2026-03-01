const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');
const { authenticate, isAdmin, isStudent } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.get('/', authenticate, isAdmin, studentsController.getAllStudents);
router.get('/me', authenticate, isStudent, studentsController.getMyProfile);
router.patch('/me', authenticate, isStudent, studentsController.updateMyProfile);
router.get('/:id', authenticate, studentsController.getStudentById);
router.post('/', authenticate, isAdmin, auditLog('CREATE_STUDENT', 'student'), studentsController.createStudent);
router.put('/:id', authenticate, isAdmin, auditLog('UPDATE_STUDENT', 'student'), studentsController.updateStudent);
router.patch('/:id/activate', authenticate, isAdmin, auditLog('ACTIVATE_STUDENT', 'student'), studentsController.activateStudent);
router.patch('/:id/deactivate', authenticate, isAdmin, auditLog('DEACTIVATE_STUDENT', 'student'), studentsController.deactivateStudent);

router.delete('/bulk', authenticate, isAdmin, auditLog('BULK_DELETE_STUDENTS', 'student'), studentsController.bulkDeleteStudents);
router.delete('/:id', authenticate, isAdmin, auditLog('DELETE_STUDENT', 'student'), studentsController.deleteStudent);

module.exports = router;

