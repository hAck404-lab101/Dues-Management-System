const { query } = require('./src/config/database');

const migrateSettingsV2 = async () => {
    try {
        console.log('Starting Settings Refactor (v2)...');

        // 1. Ensure settings table exists (just in case)
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                \`value\` TEXT,
                \`category\` VARCHAR(50) DEFAULT 'general',
                \`description\` TEXT,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        const newSettings = [
            // SYSTEM - GENERAL
            ['app_currency', 'GHS', 'sys_general', 'System currency symbol'],
            ['app_timezone', 'UTC', 'sys_general', 'System timezone'],
            ['payment_service_fee', '1.50', 'sys_general', 'Default processing fee for online payments'],

            // SYSTEM - APPEARANCE
            ['app_favicon', '/favicon.png', 'sys_appearance', 'Application favicon URL'],
            ['app_theme', 'light', 'sys_appearance', 'Default system theme (light, dark, system)'],
            ['app_footer_text', '© 2024 University Dues Management System. All Rights Reserved.', 'sys_appearance', 'Text displayed in the footer'],

            // SYSTEM - MAINTENANCE
            ['maintenance_mode', 'off', 'sys_maintenance', 'Enable/disable maintenance mode'],

            // STUDENT PORTAL
            ['available_courses', 'Computer Science, Information Technology', 'portal', 'Comma-separated list of courses'],
            ['available_levels', '100, 200, 300, 400', 'portal', 'Comma-separated list of levels'],
            ['self_registration_enabled', 'true', 'portal', 'Allow students to register themselves'],
            ['admin_approval_required', 'false', 'portal', 'Require admin approval for new students'],

            // PAYMENT - PAYSTACK
            ['paystack_enabled', 'true', 'pay_paystack', 'Enable/disable Paystack gateway'],
            ['paystack_auto_verify', 'true', 'pay_paystack', 'Automatically verify payments via webhook'],
            ['paystack_webhook_secret', '', 'pay_paystack', 'Paystack webhook secret for security'],

            // PAYMENT - MANUAL
            ['manual_payment_enabled', 'true', 'pay_manual', 'Enable/disable manual/offline payments'],
            ['manual_payment_require_proof', 'true', 'pay_manual', 'Require students to upload proof of payment'],
            ['manual_payment_workflow', 'standard', 'pay_manual', 'Approval workflow (standard, instant)'],

            // PAYMENT - SERVICE CHARGES
            ['service_charge_enabled', 'true', 'pay_charges', 'Enable/disable service charges'],
            ['service_charge_type', 'fixed', 'pay_charges', 'Service charge type (percentage, fixed)'],
            ['service_charge_scope', 'global', 'pay_charges', 'Service charge scope (global, per_due)'],

            // COMMUNICATION - SMS
            ['sms_template_payment', 'Payment of {amount} for {due_name} received. Receipt: {receipt_no}', 'comm_sms', 'Template for payment confirmation SMS'],
            ['sms_template_reminder', 'Reminder: You have an outstanding payment of {amount} for {due_name}.', 'comm_sms', 'Template for payment reminder SMS'],

            // SECURITY
            ['password_policy_min_length', '8', 'security', 'Minimum password length'],
            ['session_timeout_minutes', '60', 'security', 'Session timeout in minutes'],
            ['login_attempt_limit', '5', 'security', 'Maximum login attempts before lockout']
        ];

        // Update existing categories to match new structure
        const categoryMap = {
            'general': 'sys_general',
            'appearance': 'sys_appearance',
            'registration': 'portal',
            'paystack': 'pay_paystack',
            'payment': 'pay_manual',
            'sms': 'comm_sms',
            'email': 'comm_email'
        };

        for (const [oldCat, newCat] of Object.entries(categoryMap)) {
            await query('UPDATE settings SET category = ? WHERE category = ?', [newCat, oldCat]);
        }

        // Insert new settings
        for (const [key, value, category, description] of newSettings) {
            await query(
                'INSERT IGNORE INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?)',
                [key, value, category, description]
            );
        }

        console.log('✓ Settings migration to v2 complete.');
        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    }
};

migrateSettingsV2();
