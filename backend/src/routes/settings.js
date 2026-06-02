const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const backupController = require('../controllers/backupController');
const { authenticate, authorize } = require('../middleware/auth');
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
router.use(authorize('admin', 'treasurer', 'financial_secretary', 'president'));

router.get('/', settingsController.getSettings);
router.patch('/', settingsController.updateSettings);
router.post('/upload-logo', upload.single('logo'), settingsController.uploadLogo);
router.get('/backup/download', backupController.downloadBackup);
router.post('/backup/restore', backupUpload.single('backup'), backupController.restoreBackup);
router.post('/reset-site', authorize('admin', 'treasurer', 'president'), settingsController.resetSite);
router.get('/:category', settingsController.getSettingsByCategory);

module.exports = router;
