require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDB() {
  const host = process.env.MYSQLHOST || 'localhost';
  const port = Number(process.env.MYSQLPORT) || 3306;
  const user = process.env.MYSQLUSER || 'root';
  const password = process.env.MYSQLPASSWORD || '';
  const databaseName = process.env.MYSQLDATABASE || 'htu_dues_db';

  console.log(`Connecting to MySQL server at ${host}:${port} as user ${user}...`);

  try {
    // 1. Connect without selecting a database
    const conn = await mysql.createConnection({ host, port, user, password });
    console.log(`Creating database '${databaseName}' if it does not exist...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.end();
    console.log(`✓ Database '${databaseName}' is ready.`);
  } catch (err) {
    console.error('Error creating database:', err.message);
    process.exit(1);
  }
}

initDB();
