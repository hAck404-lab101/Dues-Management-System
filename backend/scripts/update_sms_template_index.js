const { pool } = require('../src/config/database');

async function run() {
    try {
        await pool.query(
            "UPDATE settings SET `value` = ?, description = ? WHERE `key` = ?",
            [
                'Hello {name} ({id_no}), your payment of GHS {amount} for {due_name} has been received. Receipt: {receipt_no}. Download: {url}',
                'Template for payment confirmation SMS. Use placeholders: {name}, {id_no}, {amount}, {due_name}, {receipt_no}, {url}',
                'sms_payment_template'
            ]
        );
        console.log('SMS template updated with index number placeholder');
    } catch (error) {
        console.error('Error updating template:', error);
    } finally {
        process.exit();
    }
}

run();
