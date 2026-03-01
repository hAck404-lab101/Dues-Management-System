const { pool } = require('./src/config/database');
async function run() {
    try {
        const { rows } = await pool.query('SELECT `key`, `value` FROM settings');
        rows.forEach(r => {
            console.log(`[${r.key}]: ${r.value}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
