const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const brandingController = require('../controllers/brandingController');
const backupController = require('../controllers/backupController');
const { authenticate } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const multer = require('multer');
const path = require('path');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg|webp|x-icon|vnd\.microsoft\.icon/;
        const extname = /\.(jpe?g|png|svg|webp|ico)$/i.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) cb(null, true);
        else cb(new Error('Only image files are allowed'));
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

// Public branding/settings endpoints must remain available before authentication.
router.get('/public', settingsController.getPublicSettings);
router.get('/brand-asset/:type', brandingController.getBrandAsset);

router.use(authenticate);

router.get('/', requirePermission('settings.read'), settingsController.getSettings);
router.patch('/', requirePermission('settings.write', 'settings.write_financial', 'settings.write_integrations', 'settings.write_branding'), settingsController.updateSettings);
router.post('/upload-logo', requirePermission('settings.write_branding', 'settings.write'), upload.single('logo'), brandingController.uploadLogo);
router.get('/backup/download', requirePermission('settings.write'), backupController.downloadBackup);
router.post('/backup/restore', requirePermission('settings.write'), backupUpload.single('backup'), backupController.restoreBackup);
router.post('/reset-site', requirePermission('settings.write'), settingsController.resetSite);
router.get('/:category', requirePermission('settings.read'), settingsController.getSettingsByCategory);

module.exports = router;
