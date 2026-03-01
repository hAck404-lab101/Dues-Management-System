const { pool } = require('../src/config/database');

async function run() {
    try {
        await pool.query(
            "INSERT INTO settings (`key`, `value`, category, description) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `value` = `value` ",
            [
                'sms_payment_template',
                'Hello {name}, your payment of GHS {amount} for {due_name} has been received. Receipt: {receipt_no}. Download: {url}',
                'sms',
                'Template for payment confirmation SMS. Use placeholders: {name}, {amount}, {due_name}, {receipt_no}, {url}'
            ]
        );
        console.log('SMS template setting added successfully');
    } catch (error) {
        console.error('Error adding setting:', error);
    } finally {
        process.exit();
    }
}

run();
