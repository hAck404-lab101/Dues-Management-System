require('dotenv').config();
const mysql = require('mysql2/promise');

// Parse DATABASE_URL or use individual connection parameters
let connectionConfig;

if (process.env.DATABASE_URL) {
  // Parse MySQL connection string: mysql://user:password@host:port/database
  const url = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'));
  connectionConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading '/'
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  connectionConfig = {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const pool = mysql.createPool(connectionConfig);

// Helper to format MySQL query results to match the { rows: [] } pattern used in the app
const formatResult = (result) => {
  const rows = result[0];
  return { rows: Array.isArray(rows) ? rows : [rows] };
};

// Native MySQL query function — use ? placeholders in SQL
const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return formatResult(result);
};

// Pool wrapper exposing query, getConnection, and end
const poolWrapper = {
  query,
  getConnection: async () => {
    const conn = await pool.getConnection();
    // Attach a helper query method that returns the same format as the pool wrapper
    conn.wrappedQuery = async (sql, params = []) => {
      const result = await conn.query(sql, params);
      return formatResult(result);
    };
    return conn;
  },
  end: () => pool.end()
};

// Test connection on startup
pool.getConnection()
  .then((connection) => {
    console.log('✓ Connected to MySQL database');
    connection.release();
  })
  .catch((err) => {
    console.error('✗ MySQL connection error:', err.message);
  });

module.exports = {
  pool: poolWrapper,
  query
};
