require('dotenv').config();
const { pool } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  let connection;
  try {
    connection = await pool.getConnection();
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const treasurerEmail = process.env.DEFAULT_TREASURER_EMAIL || 'treasurer@example.com';
    const financialSecretaryEmail = process.env.DEFAULT_FINANCIAL_SECRETARY_EMAIL || 'fsecretary@example.com';

    // Create default admin user
    const [adminResult] = await connection.query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      [uuidv4(), adminEmail, hashedPassword, 'president', true]
    );

    if (adminResult.affectedRows > 0) {
      console.log('Default admin user created:');
      console.log(`Email: ${adminEmail}`);
      console.log('Password: Admin123!');
    } else {
      console.log('Admin user already exists');
    }

    // Create treasurer user
    await connection.query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      [uuidv4(), treasurerEmail, hashedPassword, 'treasurer', true]
    );

    // Create financial secretary user
    await connection.query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      [uuidv4(), financialSecretaryEmail, hashedPassword, 'financial_secretary', true]
    );

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

seed();