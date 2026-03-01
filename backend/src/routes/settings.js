const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/brand';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

router.get('/public', settingsController.getPublicSettings);

// All other settings routes are protected and admin only
router.use(authenticate);
router.use(authorize('admin', 'treasurer', 'financial_secretary', 'president'));

router.get('/', settingsController.getSettings);
router.patch('/', settingsController.updateSettings);
router.post('/upload-logo', upload.single('logo'), settingsController.uploadLogo);
router.get('/:category', settingsController.getSettingsByCategory);
router.post('/reset-site', authorize('admin', 'treasurer', 'president'), settingsController.resetSite);

module.exports = router;
