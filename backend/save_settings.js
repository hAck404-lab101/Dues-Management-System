const { pool } = require('./src/config/database');
const fs = require('fs');
async function run() {
    try {
        const { rows } = await pool.query('SELECT `key`, `value` FROM settings');
        const content = rows.map(r => `[${r.key}]: ${r.value}`).join('\n');
        fs.writeFileSync('all_settings.txt', content);
        console.log('Saved to all_settings.txt');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
