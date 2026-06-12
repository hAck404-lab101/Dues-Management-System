const { query } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

const SENSITIVE_KEYS = [
    'paystack_secret_key',
    'sms_api_key',
    'email_pass',
    'paystack_webhook_secret'
];

const DEFAULT_SETTINGS = [
    ['homepage_variant', 'portal', 'sys_maintenance', 'Homepage style shown to students. Options: portal or classic']
];

const ensureDefaultSettings = async () => {
    for (const [key, value, category, description] of DEFAULT_SETTINGS) {
        await query(
            'INSERT IGNORE INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?)',
            [key, value, category, description]
        );
    }
};

exports.getSettings = async (req, res) => {
    try {
        await ensureDefaultSettings();
        const { rows } = await query('SELECT * FROM settings');

        const settingsMap = {};
        rows.forEach(s => {
            let value = s.value;
            // Decrypt sensitive data for the admin UI
            if (SENSITIVE_KEYS.includes(s.key)) {
                value = decrypt(value);
            }

            settingsMap[s.key] = {
                value: value,
                category: s.category,
                description: s.description,
                updated_at: s.updated_at
            };
        });

        res.json({ success: true, data: settingsMap });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, message: 'Invalid settings data' });
    }

    try {
        await ensureDefaultSettings();
        const keys = Object.keys(settings);

        for (const key of keys) {
            let value = settings[key];
            // Encrypt sensitive data before saving
            if (SENSITIVE_KEYS.includes(key)) {
                value = encrypt(value);
            }
            await query('UPDATE settings SET value = ? WHERE `key` = ?', [value, key]);
        }

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
};

exports.getSettingsByCategory = async (req, res) => {
    try {
        await ensureDefaultSettings();
        const { category } = req.params;
        const { rows } = await query('SELECT * FROM settings WHERE category = ?', [category]);

        const settingsMap = {};
        rows.forEach(s => {
            let value = s.value;
            if (SENSITIVE_KEYS.includes(s.key)) {
                value = decrypt(value);
            }

            settingsMap[s.key] = {
                value: value,
                category: s.category,
                description: s.description,
                updated_at: s.updated_at
            };
        });

        res.json({ success: true, data: settingsMap });
    } catch (error) {
        console.error('Get settings by category error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

exports.getPublicSettings = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        await ensureDefaultSettings();
        const publicCategories = [
            'sys_general',
            'sys_appearance',
            'portal',
            'pay_manual',
            'pay_charges'
        ];

        // We only fetch non-sensitive keys for public use
        const { rows } = await query(
            'SELECT `key`, `value` FROM settings WHERE category IN (?) AND `key` NOT IN (?)',
            [publicCategories, SENSITIVE_KEYS]
        );

        const settingsMap = {};
        rows.forEach(s => {
            // Include paystack public key too as it's needed for frontend initialization
            settingsMap[s.key] = s.value;
        });

        // Explicitly add paystack_public_key if not caught by category filter
        const pkRes = await query('SELECT value FROM settings WHERE `key` = "paystack_public_key"');
        if (pkRes.rows.length > 0) {
            settingsMap['paystack_public_key'] = pkRes.rows[0].value;
        }

        const homepageRes = await query('SELECT value FROM settings WHERE `key` = "homepage_variant"');
        settingsMap.homepage_variant = homepageRes.rows[0]?.value || 'portal';

        res.json({ success: true, data: settingsMap });
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch public settings' });
    }
};

exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { type } = req.body; // 'primary', 'secondary', 'favicon'
        const logoUrl = `/uploads/brand/${req.file.filename}`;

        let settingKey = 'app_logo';
        if (type === 'secondary') settingKey = 'app_logo_secondary';
        if (type === 'favicon') settingKey = 'app_favicon';

        await query('UPDATE settings SET value = ? WHERE `key` = ?', [logoUrl, settingKey]);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: { url: logoUrl }
        });
    } catch (error) {
        console.error('Upload logo error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
};

exports.resetSite = async (req, res) => {
    if (!['admin', 'treasurer', 'president'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { pool } = require('../config/database');
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const tablesToClear = [
            'receipts',
            'audit_logs',
            'email_notifications',
            'payments',
            'due_assignments',
            'dues',
            'students'
        ];

        for (const table of tablesToClear) {
            await connection.query(`DELETE FROM ${table}`);
        }

        await connection.query("DELETE FROM users WHERE role = 'student'");

        await connection.commit();

        res.json({
            success: true,
            message: 'Site data successfully reset.'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Reset site error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset site data' });
    } finally {
        connection.release();
    }
};