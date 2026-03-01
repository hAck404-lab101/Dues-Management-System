const { pool } = require('./src/config/database');
async function run() {
    try {
        const result = await pool.query("SELECT `key`, `value` FROM settings WHERE category = 'sms'");
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
