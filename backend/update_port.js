const { pool } = require('./src/config/database');

async function run() {
    try {
        await pool.query("UPDATE settings SET value = '465' WHERE `key` = 'email_port'");
        console.log('Database: email_port updated to 465');
    } catch (e) {
        console.error('Error updating database:', e.message);
    } finally {
        process.exit();
    }
}

run();
