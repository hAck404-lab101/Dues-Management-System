const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const backupController = require('../controllers/backupController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/brand';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => cb(null, 'logo-' + Date.now() + path.extname(file.originalname))
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

const backupUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isJson = file.mimetype === 'application/json' || path.extname(file.originalname).toLowerCase() === '.json';
        if (isJson) cb(null, true);
        else cb(new Error('Only JSON backup files are allowed'));
    }
});

router.get('/public', settingsController.getPublicSettings);

router.use(authenticate);

router.get('/', requirePermission('settings.read'), settingsController.getSettings);
router.patch('/', requirePermission('settings.write', 'settings.write_financial', 'settings.write_integrations', 'settings.write_branding'), settingsController.updateSettings);
router.post('/upload-logo', requirePermission('settings.write_branding', 'settings.write'), upload.single('logo'), settingsController.uploadLogo);
router.get('/backup/download', requirePermission('settings.write'), backupController.downloadBackup);
router.post('/backup/restore', requirePermission('settings.write'), backupUpload.single('backup'), backupController.restoreBackup);
router.post('/reset-site', requirePermission('settings.write'), settingsController.resetSite);
router.get('/:category', requirePermission('settings.read'), settingsController.getSettingsByCategory);

module.exports = router;

