const { pool } = require('./src/config/database');
const fs = require('fs');
async function run() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        fs.writeFileSync('tables.txt', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
