require('dotenv').config();
const { pool } = require('./database');
const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, 'schema.sql');
const MIGRATION_FILE = path.join(__dirname, '../../migrations/002_rbac_and_quickpay.sql');
const ROLLBACK_FILE = path.join(__dirname, '../../migrations/002_rbac_and_quickpay_rollback.sql');

async function executeSqlFile(connection, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File does not exist: ${filePath}`);
    return;
  }
  
  console.log(`Running SQL from: ${path.basename(filePath)}...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Remove comments
  let cleanSql = sql.replace(/--.*$/gm, '');
  
  const statements = [];
  let currentStatement = '';
  let depth = 0;
  
  for (let i = 0; i < cleanSql.length; i++) {
    const char = cleanSql[i];
    if (char === '(') {
      depth++;
      currentStatement += char;
    } else if (char === ')') {
      depth--;
      currentStatement += char;
    } else if (char === ';' && depth === 0) {
      currentStatement = currentStatement.trim();
      if (currentStatement.length > 0) {
        statements.push(currentStatement);
      }
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement || statement.length === 0) continue;
    
    try {
      await connection.query(statement);
      console.log(`✓ Executed statement ${i + 1}/${statements.length}`);
    } catch (error) {
      // Ignore common "already exists" and column mismatch errors during up migrations
      const isRollback = filePath.includes('rollback');
      if (!isRollback && (
        error.message.includes('already exists') || 
        error.message.includes('Duplicate') ||
        error.code === 'ER_DUP_KEYNAME' ||
        error.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
        error.code === 'ER_BAD_FIELD_ERROR'
      )) {
        console.log(`⚠ Skipped (already exists / already migrated): ${statement.substring(0, 50)}...`);
      } else {
        console.error(`✗ Error executing statement ${i + 1}:`, error.message);
        console.error(`Statement: ${statement.substring(0, 200)}...`);
        if (isRollback) {
          // In rollback, let's keep going to try to revert as much as possible
          console.log('⚠ Continuing rollback despite error...');
        } else {
          throw error;
        }
      }
    }
  }
}

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    const isRollback = process.argv.includes('rollback');
    
    if (isRollback) {
      console.log('--- STARTING ROLLBACK ---');
      await executeSqlFile(connection, ROLLBACK_FILE);
      console.log('\nDatabase rollback completed successfully');
    } else {
      console.log('--- STARTING MIGRATIONS ---');
      // Run baseline schema
      await executeSqlFile(connection, SQL_FILE);
      // Run migration v2
      await executeSqlFile(connection, MIGRATION_FILE);
      console.log('\nDatabase migration completed successfully');
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

migrate();
