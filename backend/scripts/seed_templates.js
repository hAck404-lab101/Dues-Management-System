const { pool } = require('../src/config/database');

const templates = [
    {
        key: 'sms_receipt_template',
        value: 'Hello {name}, your payment of GH₵{amount} for {due} has been received. Receipt: {receipt_no}. Index: {id_no}',
        category: 'sms',
        description: 'Template for payment confirmation SMS'
    },
    {
        key: 'sms_bulk_template_default',
        value: 'Hello {name} ({id_no}), this is a reminder from UCC Dept regarding your outstanding dues. Please check your dashboard.',
        category: 'sms',
        description: 'Default template for bulk announcements'
    }
];

async function seed() {
    const conn = await pool.getConnection();
    try {
        for (const t of templates) {
            await conn.query(
                'INSERT INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `description` = ?',
                [t.key, t.value, t.category, t.description, t.description]
            );
            console.log(`✓ Seeded ${t.key}`);
        }
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        conn.release();
        process.exit();
    }
}
seed();
