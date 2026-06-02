const { pool } = require('../config/database');

const BACKUP_TABLES = [
  'settings',
  'users',
  'students',
  'academic_years',
  'programmes',
  'dues',
  'due_assignments',
  'payments',
  'receipts',
  'sms_logs',
  'email_notifications',
  'audit_logs'
];

const RESTORE_ORDER = [
  'audit_logs',
  'email_notifications',
  'sms_logs',
  'receipts',
  'payments',
  'due_assignments',
  'dues',
  'students',
  'users',
  'programmes',
  'academic_years',
  'settings'
];

const canRunBackupAction = (user) => ['admin', 'treasurer', 'president'].includes(user?.role);

const tableExists = async (table) => {
  try {
    const result = await pool.query(`SHOW TABLES LIKE ?`, [table]);
    return result.rows.length > 0;
  } catch (_) {
    return false;
  }
};

const getTableColumns = async (connection, table) => {
  const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
  return columns.map(col => col.Field);
};

exports.downloadBackup = async (req, res) => {
  if (!canRunBackupAction(req.user)) return res.status(403).json({ success: false, message: 'Unauthorized backup action' });

  try {
    const backup = {
      meta: {
        app: 'Dues Management System',
        version: 1,
        created_at: new Date().toISOString(),
        created_by: req.user?.email || req.user?.id || 'admin',
        note: 'Database backup only. Source code is stored in GitHub.'
      },
      tables: {}
    };

    for (const table of BACKUP_TABLES) {
      if (!(await tableExists(table))) {
        backup.tables[table] = [];
        continue;
      }
      const result = await pool.query(`SELECT * FROM ${table}`);
      backup.tables[table] = result.rows;
    }

    const filename = `dues-management-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate backup' });
  }
};

exports.restoreBackup = async (req, res) => {
  if (!canRunBackupAction(req.user)) return res.status(403).json({ success: false, message: 'Unauthorized restore action' });
  if (!req.file?.buffer) return res.status(400).json({ success: false, message: 'Backup JSON file is required' });
  if (req.body.confirmation !== 'RESTORE BACKUP') return res.status(400).json({ success: false, message: 'Type RESTORE BACKUP to confirm restore' });

  let backup;
  try {
    backup = JSON.parse(req.file.buffer.toString('utf8'));
  } catch (_) {
    return res.status(400).json({ success: false, message: 'Invalid backup file format' });
  }

  if (!backup?.tables || typeof backup.tables !== 'object') {
    return res.status(400).json({ success: false, message: 'Backup file is missing table data' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of RESTORE_ORDER) {
      if (await tableExists(table)) await connection.query(`DELETE FROM ${table}`);
    }

    for (const table of BACKUP_TABLES) {
      const rows = backup.tables[table];
      if (!Array.isArray(rows) || rows.length === 0 || !(await tableExists(table))) continue;
      const columns = await getTableColumns(connection, table);
      for (const row of rows) {
        const validKeys = Object.keys(row).filter(key => columns.includes(key));
        if (validKeys.length === 0) continue;
        const placeholders = validKeys.map(() => '?').join(', ');
        const values = validKeys.map(key => row[key]);
        await connection.query(
          `INSERT INTO ${table} (${validKeys.map(key => `\`${key}\``).join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    res.json({ success: true, message: 'Backup restored successfully. Please refresh the dashboard.' });
  } catch (error) {
    await connection.rollback();
    try { await connection.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    console.error('Backup restore error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore backup' });
  } finally {
    connection.release();
  }
};
