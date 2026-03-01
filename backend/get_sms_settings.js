const { pool } = require('./src/config/database');
async function run() {
    try {
        const [rows] = await pool.query("SELECT * FROM settings WHERE `key` LIKE 'sms_%'");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
