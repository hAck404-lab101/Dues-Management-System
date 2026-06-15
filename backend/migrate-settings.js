const { query } = require('./src/config/database');

const createSettingsTable = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                \`value\` TEXT,
                \`category\` VARCHAR(50) DEFAULT 'general',
                \`description\` TEXT,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Settings table created successfully');

        // Insert neutral default settings if they don't exist
        const defaultSettings = [
            ['app_name', 'Dues Management System', 'appearance', 'The name of the application'],
            ['app_logo', '', 'appearance', 'URL to the application logo'],
            ['app_logo_secondary', '', 'appearance', 'Secondary logo for dark backgrounds'],
            ['primary_color', '#0B3C5D', 'appearance', 'Primary theme color (CSS variable)'],
            ['secondary_color', '#F2A900', 'appearance', 'Secondary theme color (CSS variable)'],

            ['available_programmes', 'Computer Science,Information Technology,Software Engineering', 'registration', 'Comma-separated list of available programmes'],
            ['available_academic_years', '2024/2025,2025/2026,2026/2027', 'registration', 'Comma-separated list of available academic years'],
            ['registration_status', 'open', 'registration', 'Registration status (open/closed)'],

            ['paystack_public_key', 'pk_test_placeholder', 'paystack', 'Paystack Public Key'],
            ['paystack_secret_key', 'sk_test_placeholder', 'paystack', 'Paystack Secret Key'],
            ['payment_service_fee', '1.50', 'general', 'Processing fee for online payments (GHS)'],

            ['manual_payment_phone', '0240000000 / 0500000000', 'payment', 'MoMo account/Phone number for offline payment'],
            ['manual_payment_bank', 'Bank Account: 1234567890, Branch: Main', 'payment', 'Bank account details for offline payment'],
            ['manual_payment_instructions', '1. Transfer the amount to the approved account.\n2. Screenshot/Save receipt.\n3. Upload screenshot in the Payment Proof section.\n4. Wait for admin approval.', 'payment', 'Instructions for students making manual payments'],

            ['sms_provider', 'arkesel', 'sms', 'SMS API Provider'],
            ['sms_api_key', '', 'sms', 'SMS API Key'],
            ['sms_sender_id', 'DUES', 'sms', 'SMS Sender ID'],

            ['email_host', 'smtp.brevo.com', 'email', 'SMTP Host'],
            ['email_port', '587', 'email', 'SMTP Port'],
            ['email_user', '', 'email', 'SMTP Username'],
            ['email_pass', '', 'email', 'SMTP Password'],
            ['email_from', 'no-reply@example.com', 'email', 'Email From Address'],
            ['email_from_name', 'Dues Management System', 'email', 'Sender Name for Emails']
        ];

        for (const [key, value, category, description] of defaultSettings) {
            await query(
                'INSERT IGNORE INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?)',
                [key, value, category, description]
            );
        }

        // Clean old hard-coded UCC values in databases that were created from earlier versions.
        await query("UPDATE settings SET `value` = 'Dues Management System' WHERE `key` = 'app_name' AND `value` LIKE '%UCC%'");
        await query("UPDATE settings SET `value` = 'DUES' WHERE `key` = 'sms_sender_id' AND `value` LIKE '%UCC%'");
        await query("UPDATE settings SET `value` = 'no-reply@example.com' WHERE `key` = 'email_from' AND `value` LIKE '%ucc%'");
        await query("UPDATE settings SET `value` = 'Dues Management System' WHERE `key` = 'email_from_name' AND `value` LIKE '%UCC%'");
        await query("UPDATE settings SET `value` = 'Bank Account: 1234567890, Branch: Main' WHERE `key` = 'manual_payment_bank' AND `value` LIKE '%UCC%'");

        console.log('Default settings successfully initialized/updated');
        process.exit(0);
    } catch (error) {
        console.error('Error creating/migrating settings table:', error);
        process.exit(1);
    }
};

createSettingsTable();