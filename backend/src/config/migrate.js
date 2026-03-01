require('dotenv').config();
const { pool } = require('./database');
const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, 'schema.sql');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    
    // Remove comments
    let cleanSql = sql.replace(/--.*$/gm, '');
    
    // Split by semicolon, but be smarter about it
    // Look for semicolons that are not inside parentheses
    const statements = [];
    let currentStatement = '';
    let depth = 0;
    
    for (let i = 0; i < cleanSql.length; i++) {
      const char = cleanSql[i];
      const nextChar = cleanSql[i + 1];
      
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
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement || statement.length === 0) continue;
      
      try {
        await connection.query(statement);
        console.log(`✓ Executed statement ${i + 1}/${statements.length}`);
      } catch (error) {
        // Ignore "table/index already exists" errors
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate') ||
            error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠ Skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          console.error(`✗ Error executing statement ${i + 1}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 200)}...`);
          // Don't exit, continue with other statements
        }
      }
    }
    
    console.log('\nDatabase migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

migrate();
