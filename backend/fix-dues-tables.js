require('dotenv').config();
const { pool } = require('./src/config/database');

const run = async () => {
  const connection = await pool.getConnection();

  const exec = async (label, sql, params = []) => {
    try {
      await connection.query(sql, params);
      console.log(`✓ ${label}`);
    } catch (error) {
      if (
        error.code === 'ER_DUP_FIELDNAME' ||
        error.code === 'ER_DUP_KEYNAME' ||
        error.code === 'ER_TABLE_EXISTS_ERROR' ||
        error.message.includes('Duplicate') ||
        error.message.includes('already exists')
      ) {
        console.log(`⚠ ${label} skipped: ${error.message}`);
        return;
      }
      throw error;
    }
  };

  try {
    console.log('Starting dues table repair...');

    await exec('Ensure dues table exists', `
      CREATE TABLE IF NOT EXISTS dues (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        deadline DATE,
        late_fee DECIMAL(10, 2) DEFAULT 0.00,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by CHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await exec('Ensure dues.late_fee exists', 'ALTER TABLE dues ADD COLUMN late_fee DECIMAL(10, 2) DEFAULT 0.00 AFTER deadline');
    await exec('Ensure dues.description exists', 'ALTER TABLE dues ADD COLUMN description TEXT AFTER late_fee');
    await exec('Ensure dues.is_active exists', 'ALTER TABLE dues ADD COLUMN is_active BOOLEAN DEFAULT true AFTER description');
    await exec('Ensure dues.created_by exists', 'ALTER TABLE dues ADD COLUMN created_by CHAR(36) AFTER is_active');
    await exec('Ensure dues.created_at exists', 'ALTER TABLE dues ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER created_by');
    await exec('Ensure dues.updated_at exists', 'ALTER TABLE dues ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');

    await exec('Ensure due_assignments table exists', `
      CREATE TABLE IF NOT EXISTS due_assignments (
        id CHAR(36) PRIMARY KEY,
        due_id CHAR(36) NOT NULL,
        student_id CHAR(36) NOT NULL,
        level INT,
        programme VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_assignment (due_id, student_id)
      )
    `);

    await exec('Ensure due_assignments.level exists', 'ALTER TABLE due_assignments ADD COLUMN level INT AFTER student_id');
    await exec('Ensure due_assignments.programme exists', 'ALTER TABLE due_assignments ADD COLUMN programme VARCHAR(255) AFTER level');
    await exec('Ensure due_assignments.status exists', "ALTER TABLE due_assignments ADD COLUMN status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid' AFTER amount");
    await exec('Ensure due_assignments.assigned_at exists', 'ALTER TABLE due_assignments ADD COLUMN assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status');
    await exec('Ensure due_assignments.updated_at exists', 'ALTER TABLE due_assignments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER assigned_at');
    await exec('Ensure unique due assignment key exists', 'ALTER TABLE due_assignments ADD UNIQUE KEY unique_assignment (due_id, student_id)');

    const [oldStudentDuesTables] = await connection.query("SHOW TABLES LIKE 'student_dues'");
    if (oldStudentDuesTables.length > 0) {
      console.log('Found old student_dues table. Copying any missing records into due_assignments...');
      await exec('Copy student_dues into due_assignments', `
        INSERT IGNORE INTO due_assignments (id, due_id, student_id, level, programme, amount, assigned_at)
        SELECT
          COALESCE(NULLIF(CAST(id AS CHAR), ''), UUID()),
          due_id,
          student_id,
          level,
          programme,
          amount,
          COALESCE(assigned_at, CURRENT_TIMESTAMP)
        FROM student_dues
        WHERE due_id IS NOT NULL AND student_id IS NOT NULL
      `);
    }

    await exec('Ensure payments.service_fee exists', 'ALTER TABLE payments ADD COLUMN service_fee DECIMAL(10, 2) DEFAULT 0.00 AFTER amount');

    const [duesCount] = await connection.query('SELECT COUNT(*) AS total FROM dues');
    const [assignmentsCount] = await connection.query('SELECT COUNT(*) AS total FROM due_assignments');

    console.log(`\nDues table repair completed.`);
    console.log(`dues rows: ${duesCount[0].total}`);
    console.log(`due_assignments rows: ${assignmentsCount[0].total}`);
    console.log('\nActive dues tables should be: dues and due_assignments. student_dues can remain as old backup, but the app does not use it directly.');
  } catch (error) {
    console.error('Dues table repair failed:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
