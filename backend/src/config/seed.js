require('dotenv').config();
const { pool } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const createTemporaryPassword = () => crypto.randomBytes(12).toString('base64url');

const STAFF_ACCOUNTS = [
  {
    label: 'System Admin',
    role: 'admin',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  },
  {
    label: 'President',
    role: 'president',
    email: process.env.DEFAULT_PRESIDENT_EMAIL || 'president@example.com',
    password: process.env.DEFAULT_PRESIDENT_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  },
  {
    label: 'Treasurer',
    role: 'treasurer',
    email: process.env.DEFAULT_TREASURER_EMAIL || 'treasurer@example.com',
    password: process.env.DEFAULT_TREASURER_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  },
  {
    label: 'Financial Secretary',
    role: 'financial_secretary',
    email: process.env.DEFAULT_FINANCIAL_SECRETARY_EMAIL || 'fsecretary@example.com',
    password: process.env.DEFAULT_FINANCIAL_SECRETARY_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  }
];

async function upsertStaffAccount(connection, account) {
  const password = account.password || createTemporaryPassword();
  const hashedPassword = await bcrypt.hash(password, 10);

  await connection.query(
    `INSERT INTO users (id, email, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       role = VALUES(role),
       is_active = VALUES(is_active)`,
    [uuidv4(), account.email, hashedPassword, account.role, true]
  );

  return password;
}

async function seed() {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('Repairing staff accounts...');
    for (const account of STAFF_ACCOUNTS) {
      const password = await upsertStaffAccount(connection, account);
      console.log(`${account.label} (${account.role})`);
      console.log(`Email: ${account.email}`);
      console.log(`Password: ${password}`);
    }

    console.log('Staff credentials repaired successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

seed();
