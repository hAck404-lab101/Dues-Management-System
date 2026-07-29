const { query } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

const SENSITIVE_KEYS = [
    'paystack_secret_key',
    'sms_api_key',
    'email_pass',
    'paystack_webhook_secret'
];

const DEFAULT_APP_NAME = process.env.DEFAULT_APP_NAME || 'DuesPay';
const DEFAULT_APP_DESCRIPTION = process.env.DEFAULT_APP_DESCRIPTION || 'A secure student portal for dues, payments, receipts, and clearance records.';

const DEFAULT_SETTINGS = [
    ['homepage_variant', 'portal', 'sys_maintenance', 'Homepage style shown to students. Options: portal or classic'],
    ['app_name', DEFAULT_APP_NAME, 'sys_general', 'Application name'],
    ['app_description', DEFAULT_APP_DESCRIPTION, 'sys_general', 'Application link preview description'],
    ['sms_sender_id', process.env.DEFAULT_SMS_SENDER_ID || 'DUES', 'comm_sms', 'SMS sender ID'],
    ['email_from_name', process.env.DEFAULT_EMAIL_FROM_NAME || DEFAULT_APP_NAME, 'comm_email', 'Email sender display name']
];

const cleanPublicBrandText = (value, fallback = '') => {
    const text = String(value || fallback || '').trim();
    if (!text) return fallback;
    return text
        .replace(/University of Cape Coast/gi, 'DuesPay')
        .replace(/\bUCC\b/gi, 'DuesPay')
        .replace(/Ho Technical University/gi, 'DuesPay')
        .replace(/\bHTU\b/gi, 'DuesPay')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

const cleanOldUccBranding = async () => {
    const replacements = [
        ['app_name', DEFAULT_APP_NAME, '%UCC%'],
        ['app_name', DEFAULT_APP_NAME, '%University of Cape Coast%'],
        ['app_name', DEFAULT_APP_NAME, '%HTU%'],
        ['app_name', DEFAULT_APP_NAME, '%Ho Technical University%'],
        ['sms_sender_id', process.env.DEFAULT_SMS_SENDER_ID || 'DUES', '%UCC%'],
        ['sms_sender_id', process.env.DEFAULT_SMS_SENDER_ID || 'DUES', '%HTU%'],
        ['email_from', process.env.DEFAULT_EMAIL_FROM || 'no-reply@example.com', '%ucc%'],
        ['email_from_name', process.env.DEFAULT_EMAIL_FROM_NAME || DEFAULT_APP_NAME, '%UCC%'],
        ['email_from_name', process.env.DEFAULT_EMAIL_FROM_NAME || DEFAULT_APP_NAME, '%University of Cape Coast%'],
        ['email_from_name', process.env.DEFAULT_EMAIL_FROM_NAME || DEFAULT_APP_NAME, '%HTU%'],
        ['email_from_name', process.env.DEFAULT_EMAIL_FROM_NAME || DEFAULT_APP_NAME, '%Ho Technical University%'],
        ['manual_payment_bank', process.env.DEFAULT_MANUAL_PAYMENT_BANK || 'Bank Account: 1234567890, Branch: Main', '%UCC%']
    ];

    for (const [key, value, match] of replacements) {
        await query('UPDATE settings SET `value` = ? WHERE `key` = ? AND `value` LIKE ?', [value, key, match]);
    }

    await query("UPDATE settings SET `value` = REPLACE(`value`, 'UCC Dues', 'Dues') WHERE `value` LIKE '%UCC Dues%'");
    await query("UPDATE settings SET `value` = REPLACE(`value`, 'University of Cape Coast', 'DuesPay') WHERE `value` LIKE '%University of Cape Coast%'");
    await query("UPDATE settings SET `value` = REPLACE(`value`, 'Ho Technical University', 'DuesPay') WHERE `value` LIKE '%Ho Technical University%'");
    await query("UPDATE settings SET `value` = REPLACE(`value`, 'UCC', 'DuesPay') WHERE `value` LIKE '%UCC%'");
    await query("UPDATE settings SET `value` = REPLACE(`value`, 'HTU', 'DuesPay') WHERE `value` LIKE '%HTU%'");
    await query("UPDATE settings SET `value` = REPLACE(`value`, 'Dues Management System', 'DuesPay') WHERE `value` LIKE '%Dues Management System%'");
};

const ensureDefaultSettings = async () => {
    for (const [key, value, category] of DEFAULT_SETTINGS) {
        await query(
            'INSERT IGNORE INTO settings (`key`, `value`, `category`) VALUES (?, ?, ?)',
            [key, value, category]
        );
    }

    await cleanOldUccBranding();
};

exports.getSettings = async (req, res) => {
    try {
        await ensureDefaultSettings();
        const { rows } = await query('SELECT * FROM settings');

        const settingsMap = {};
        rows.forEach(s => {
            let value = s.value;
            if (SENSITIVE_KEYS.includes(s.key)) {
                value = decrypt(value);
            }

            settingsMap[s.key] = {
                value,
                category: s.category,
                description: '',
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
            if (SENSITIVE_KEYS.includes(key)) {
                value = encrypt(value);
            }
            await query('UPDATE settings SET value = ? WHERE `key` = ?', [value, key]);
        }

        await cleanOldUccBranding();

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
                value,
                category: s.category,
                description: '',
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

        const { rows } = await query(
            'SELECT `key`, `value` FROM settings WHERE category IN (?) AND `key` NOT IN (?)',
            [publicCategories, SENSITIVE_KEYS]
        );

        const settingsMap = {};
        rows.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        settingsMap.app_name = cleanPublicBrandText(settingsMap.app_name, DEFAULT_APP_NAME);
        settingsMap.app_description = cleanPublicBrandText(settingsMap.app_description, DEFAULT_APP_DESCRIPTION);
        settingsMap.sms_sender_id = cleanPublicBrandText(settingsMap.sms_sender_id, process.env.DEFAULT_SMS_SENDER_ID || 'DUES');
        settingsMap.email_from_name = cleanPublicBrandText(settingsMap.email_from_name, process.env.DEFAULT_EMAIL_FROM_NAME || DEFAULT_APP_NAME);

        const pkRes = await query('SELECT value FROM settings WHERE `key` = "paystack_public_key"');
        if (pkRes.rows.length > 0) {
            settingsMap.paystack_public_key = pkRes.rows[0].value;
        }

        const homepageRes = await query('SELECT value FROM settings WHERE `key` = "homepage_variant"');
        settingsMap.homepage_variant = homepageRes.rows[0]?.value || 'portal';

        const turnstileEnabledRes = await query('SELECT value FROM settings WHERE `key` = "turnstile_enabled"');
        settingsMap.turnstile_enabled = turnstileEnabledRes.rows[0]?.value || 'false';

        const turnstileSiteKeyRes = await query('SELECT value FROM settings WHERE `key` = "turnstile_site_key"');
        settingsMap.turnstile_site_key = turnstileSiteKeyRes.rows[0]?.value || '';

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

        const { type } = req.body;
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

    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required to reset the site' });
    }

    const { query } = require('../config/database');
    const userRes = await query('SELECT password FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, userRes.rows[0].password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid password' });
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

        res.json({ success: true, message: 'Site data successfully reset.' });
    } catch (error) {
        await connection.rollback();
        console.error('Reset site error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset site data' });
    } finally {
        connection.release();
    }
};
