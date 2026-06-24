const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const clearanceEmailController = require('../controllers/clearanceEmailController');
const usersController = require('../controllers/usersController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { auditLog } = require('../middleware/auditLog');

// Audit and SMS logs
router.get('/audit-logs', authenticate, requirePermission('audit_logs.view_all'), adminController.getAuditLogs);
router.get('/sms-logs', authenticate, requirePermission('system_logs.view', 'audit_logs.view_all'), adminController.getSmsLogs);

// Student management
router.post('/promote-students', authenticate, requirePermission('students.edit'), adminController.promoteStudents);
router.post('/archive-data', authenticate, requirePermission('settings.write'), adminController.archiveData);
router.post('/bulk-import-students', authenticate, requirePermission('students.import'), auditLog('BULK_IMPORT_STUDENTS', 'student'), adminController.bulkImportStudents);

// Clearance
router.get('/students/:id/clearance', authenticate, requirePermission('students.view'), adminController.getStudentClearance);
router.get('/students/:id/clearance-pdf', authenticate, requirePermission('students.view'), adminController.downloadClearancePDF);
router.post('/students/:id/clearance-email', authenticate, requirePermission('students.view'), auditLog('SEND_CLEARANCE_EMAIL', 'student'), clearanceEmailController.sendClearancePDFEmail);
router.post('/students/:id/send-credentials', authenticate, requirePermission('students.edit'), auditLog('SEND_CREDENTIALS', 'student'), adminController.sendStudentCredentials);

// Bulk SMS
router.post('/bulk-sms', authenticate, requirePermission('reminders.send'), auditLog('BULK_SMS', 'sms'), adminController.sendBulkSMS);
router.get('/bulk-sms/preview', authenticate, requirePermission('reminders.send'), adminController.previewBulkSMSRecipients);

// Staff Management
router.get('/users', authenticate, requirePermission('users.edit'), usersController.getStaffUsers);
router.post('/users', authenticate, requirePermission('users.create'), auditLog('CREATE_STAFF', 'user'), usersController.createStaffUser);
router.patch('/users/:id', authenticate, requirePermission('users.edit'), auditLog('UPDATE_STAFF', 'user'), usersController.updateStaffUser);
router.delete('/users/:id', authenticate, requirePermission('users.deactivate'), auditLog('DELETE_STAFF', 'user'), usersController.deleteStaffUser);

module.exports = router;

