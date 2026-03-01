const { pool } = require('../src/config/database');

async function run() {
    try {
        await pool.query(
            "INSERT INTO settings (`key`, `value`, category, description) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `value` = `value` ",
            [
                'app_logo_secondary',
                '',
                'appearance',
                'Secondary logo for the department (displayed alongside the primary school logo)'
            ]
        );
        console.log('Secondary logo setting added successfully');
    } catch (error) {
        console.error('Error adding setting:', error);
    } finally {
        process.exit();
    }
}

run();
