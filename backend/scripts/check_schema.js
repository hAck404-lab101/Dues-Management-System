const { pool } = require('../src/config/database');

async function run() {
    try {
        const conn = await pool.getConnection();

        // Check late_fee column
        const [lateFeeCheck] = await conn.query("SHOW COLUMNS FROM dues LIKE 'late_fee'");
        console.log('late_fee column rows:', lateFeeCheck.length);

        // Check audit_logs
        const [auditCheck] = await conn.query("SHOW TABLES LIKE 'audit_logs'");
        console.log('audit_logs table rows:', auditCheck.length);

        conn.release();
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
run();
