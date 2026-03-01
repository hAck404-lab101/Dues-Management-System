const { pool } = require('../src/config/database');

async function run() {
    const conn = await pool.getConnection();
    try {
        console.log('Running schema migrations...');

        // 1. Add late_fee to dues table
        try {
            await conn.query('ALTER TABLE dues ADD COLUMN late_fee DECIMAL(10,2) DEFAULT 0 COMMENT "Fixed amount added after deadline"');
            console.log('✓ Added late_fee to dues');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ late_fee already exists');
            else throw e;
        }

        // 2. Create audit_logs table if not exists
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36),
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50),
          resource_id VARCHAR(36),
          old_values JSON,
          new_values JSON,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
            console.log('✓ audit_logs table ready');
        } catch (e) {
            console.log('audit_logs:', e.message);
        }

        // 3. Add reset_password_token fields to users if not exist
        try {
            await conn.query('ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) DEFAULT NULL');
            console.log('✓ Added reset_password_token to users');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ reset_password_token already exists');
            else throw e;
        }
        try {
            await conn.query('ALTER TABLE users ADD COLUMN reset_password_expires DATETIME DEFAULT NULL');
            console.log('✓ Added reset_password_expires to users');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ reset_password_expires already exists');
            else throw e;
        }

        console.log('\nAll migrations complete!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        conn.release();
        process.exit();
    }
}
run();
