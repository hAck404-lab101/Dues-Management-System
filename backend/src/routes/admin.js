const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const usersController = require('../controllers/usersController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

// Audit logs
router.get('/audit-logs', authenticate, isAdmin, adminController.getAuditLogs);

// Student management
router.post('/promote-students', authenticate, isAdmin, adminController.promoteStudents);
router.post('/archive-data', authenticate, isAdmin, adminController.archiveData);
router.post('/bulk-import-students', authenticate, isAdmin, auditLog('BULK_IMPORT_STUDENTS', 'student'), adminController.bulkImportStudents);

// Clearance
router.get('/students/:id/clearance', authenticate, isAdmin, adminController.getStudentClearance);
router.get('/students/:id/clearance-pdf', authenticate, isAdmin, adminController.downloadClearancePDF);

// Bulk SMS
router.post('/bulk-sms', authenticate, isAdmin, auditLog('BULK_SMS', 'sms'), adminController.sendBulkSMS);
router.get('/bulk-sms/preview', authenticate, isAdmin, adminController.previewBulkSMSRecipients);

// Staff Management
router.get('/users', authenticate, isAdmin, usersController.getStaffUsers);
router.post('/users', authenticate, isAdmin, auditLog('CREATE_STAFF', 'user'), usersController.createStaffUser);
router.patch('/users/:id', authenticate, isAdmin, auditLog('UPDATE_STAFF', 'user'), usersController.updateStaffUser);
router.delete('/users/:id', authenticate, isAdmin, auditLog('DELETE_STAFF', 'user'), usersController.deleteStaffUser);

module.exports = router;
