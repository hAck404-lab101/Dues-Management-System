require('dotenv').config();
const { pool } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  let connection;
  try {
    connection = await pool.getConnection();
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    // Create default admin user
    const [adminResult] = await connection.query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      [uuidv4(), 'admin@ucc.edu.gh', hashedPassword, 'president', true]
    );

    if (adminResult.affectedRows > 0) {
      console.log('Default admin user created:');
      console.log('Email: admin@ucc.edu.gh');
      console.log('Password: Admin123!');
    } else {
      console.log('Admin user already exists');
    }

    // Create treasurer user
    await connection.query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      [uuidv4(), 'treasurer@ucc.edu.gh', hashedPassword, 'treasurer', true]
    );

    // Create financial secretary user
    await connection.query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      [uuidv4(), 'fsecretary@ucc.edu.gh', hashedPassword, 'financial_secretary', true]
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
