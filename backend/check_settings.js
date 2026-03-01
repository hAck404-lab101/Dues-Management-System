const { pool } = require('./src/config/database');
async function run() {
    try {
        const { rows } = await pool.query('SELECT `key`, `value`, `category` FROM settings WHERE category IN ("sms", "email", "general")');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
