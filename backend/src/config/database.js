require('dotenv').config();
const mysql = require('mysql2/promise');

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const poolOptions = {
  waitForConnections: true,
  connectionLimit: parseNumber(process.env.DB_CONNECTION_LIMIT, 25),
  maxIdle: parseNumber(process.env.DB_MAX_IDLE, 10),
  idleTimeout: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 60000),
  queueLimit: parseNumber(process.env.DB_QUEUE_LIMIT, 500),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: false,
  dateStrings: false,
  connectTimeout: parseNumber(process.env.DB_CONNECT_TIMEOUT_MS, 20000)
};

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
    ...poolOptions
  };
} else {
  const requiredVars = [
    'MYSQLHOST',
    'MYSQLUSER',
    'MYSQLPASSWORD',
    'MYSQLDATABASE',
    'MYSQLPORT'
  ];

  const missingVars = requiredVars.filter((key) => process.env[key] === undefined);

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
    ...poolOptions
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

  execute: async (sql, params = []) => {
    const result = await pool.execute(sql, params);
    return formatResult(result);
  },

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
    console.log(`✓ Connected to MySQL database with pool limit ${connectionConfig.connectionLimit}`);
    connection.release();
  })
  .catch((err) => {
    console.error('✗ MySQL connection error:', err.message);
  });

module.exports = {
  pool: poolWrapper,
  query
};
