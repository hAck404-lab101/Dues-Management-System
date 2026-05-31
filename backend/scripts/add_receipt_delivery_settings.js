const { pool } = require('../src/config/database');

async function run() {
    try {
        console.log('Inserting receipt delivery settings into database...');
        
        // 1. Seed Email Delivery Setting
        await pool.query(
            "INSERT INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `key` = `key` ",
            [
                'receipt_email_delivery_enabled',
                'true',
                'comm_email',
                'Automatically email receipt when payment is approved or completed'
            ]
        );
        console.log('✓ Email delivery setting seeded successfully.');

        // 2. Seed SMS Delivery Setting
        await pool.query(
            "INSERT INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `key` = `key` ",
            [
                'receipt_sms_delivery_enabled',
                'true',
                'comm_sms',
                'Automatically send SMS receipt when payment is approved or completed'
            ]
        );
        console.log('✓ SMS delivery setting seeded successfully.');
        
    } catch (error) {
        console.error('Error seeding settings:', error);
    } finally {
        process.exit();
    }
}

run();
