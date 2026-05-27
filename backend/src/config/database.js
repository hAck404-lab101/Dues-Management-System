require('dotenv').config();
const mysql = require('mysql2/promise');

let connectionConfig;

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.MYSQLURL;

if (databaseUrl) {
  const url = new URL(databaseUrl);

  connectionConfig = {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', ''),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  const requiredVars = [
    'MYSQLHOST',
    'MYSQLUSER',
    'MYSQLPASSWORD',
    'MYSQLDATABASE',
    'MYSQLPORT'
  ];

  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing MySQL environment variables: ${missingVars.join(', ')}`
    );
  }

  connectionConfig = {
    host: process.env.MYSQLHOST,
    port: Number(process.env.MYSQLPORT) || 3306,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const pool = mysql.createPool(connectionConfig);

const formatResult = (result) => {
  const rows = result[0];
  return { rows: Array.isArray(rows) ? rows : [rows] };
};

const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return formatResult(result);
};

const poolWrapper = {
  query,

  getConnection: async () => {
    const conn = await pool.getConnection();

    conn.wrappedQuery = async (sql, params = []) => {
      const result = await conn.query(sql, params);
      return formatResult(result);
    };

    return conn;
  },

  end: () => pool.end()
};

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
