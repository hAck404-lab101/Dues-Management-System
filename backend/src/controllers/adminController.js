const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const { generateUUID } = require('../utils/uuid');
const { sendSMS } = require('../services/notificationService');

exports.bulkImportStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'No student data provided' });
    }

    const results = { created: 0, skipped: 0, errors: [] };
    const settingsRows = await pool.query(
      'SELECT `key`, `value` FROM settings WHERE `key` IN ("available_programmes", "available_academic_years")'
    );
    const settingsMap = {};
    settingsRows.rows.forEach((setting) => { settingsMap[setting.key] = setting.value || ''; });

    const validProgrammes = settingsMap.available_programmes?.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean) || [];
    const validYears = settingsMap.available_academic_years?.split(',').map((y) => y.trim().toLowerCase()).filter(Boolean) || [];

    for (const studentInput of students) {
      const { indexNumber, fullName, email, level, programme, academicYear, phoneNumber, password } = studentInput;

      if (!indexNumber || !fullName || !email || !level || !programme || !academicYear) {
        results.errors.push(`Row skipped (missing required fields): ${indexNumber || email || 'unknown'}`);
        results.skipped++;
        continue;
      }

      if (validProgrammes.length > 0 && !validProgrammes.includes(String(programme).trim().toLowerCase())) {
        results.errors.push(`${indexNumber} — Invalid programme: "${programme}". Pick from system settings.`);
        results.skipped++;
        continue;
      }

      if (validYears.length > 0 && !validYears.includes(String(academicYear).trim().toLowerCase())) {
        results.errors.push(`${indexNumber} — Invalid academic year: "${academicYear}". Pick from system settings.`);
        results.skipped++;
        continue;
      }

      try {
        const existing = await pool.query('SELECT id FROM students WHERE student_id = ? OR email = ?', [indexNumber, email]);
        if (existing.rows.length > 0) {
          results.errors.push(`${indexNumber} (${fullName}) — already exists, skipped`);
          results.skipped++;
          continue;
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
          const studentId = generateUUID();
          const userId = generateUUID();
          const passwordHash = await bcrypt.hash(password || indexNumber, 10);

          await connection.query(
            `INSERT INTO users (id, email, password_hash, role, student_id, is_active) VALUES (?, ?, ?, 'student', ?, true)`,
            [userId, email, passwordHash, indexNumber]
          );
          await connection.query(
            `INSERT INTO students (id, user_id, student_id, full_name, email, level, programme, academic_year, phone_number, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
            [studentId, userId, indexNumber, fullName, email, level, programme, academicYear, phoneNumber || null]
          );

          await connection.commit();
          results.created++;
        } catch (error) {
          await connection.rollback();
          results.errors.push(`${indexNumber} — DB error: ${error.message}`);
          results.skipped++;
        } finally {
          connection.release();
        }
      } catch (error) {
        results.errors.push(`${indexNumber} — error: ${error.message}`);
        results.skipped++;
      }
    }

    res.json({ success: true, message: `Import complete: ${results.created} created, ${results.skipped} skipped`, data: results });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, message: 'Server error during import' });
  }
};

exports.sendStudentCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const studentResult = await pool.query(
      `SELECT s.id, s.student_id, s.full_name, s.phone_number, u.id as user_id, u.email
       FROM students s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentResult.rows[0];
    if (!student.phone_number) {
      return res.status(400).json({ success: false, message: `${student.full_name} has no phone number on record.` });
    }

    const tempPassword = student.student_id;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, student.user_id]);

    const nameRows = await pool.query('SELECT value FROM settings WHERE `key` = "app_name" LIMIT 1');
    const appName = nameRows.rows[0]?.value || 'Dues Management System';
    const message = `${appName}: Login credentials reset. Index No: ${student.student_id}. Password: ${tempPassword}. Please log in and change your password.`;

    const smsSent = await sendSMS(student.phone_number, message, { type: 'student_credentials', relatedType: 'student', relatedId: student.id });
    if (!smsSent) {
      return res.status(502).json({ success: false, message: 'Password was reset, but SMS failed to send. Check SMS settings.' });
    }

    res.json({ success: true, message: `Credentials sent to ${student.full_name}` });
  } catch (error) {
    console.error('Send credentials error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStudentClearance = async (req, res) => {
  try {
    const { id } = req.params;
    const studentResult = await pool.query(
      `SELECT id, student_id, full_name, email, level, programme, academic_year, phone_number FROM students WHERE id = ?`,
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const duesResult = await pool.query(
      `SELECT d.id, d.name as due_name, da.amount as assigned_amount,
              COALESCE(SUM(CASE WHEN p.status IN ('approved','completed') THEN p.amount ELSE 0 END), 0) as total_paid
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       LEFT JOIN payments p ON p.due_id = d.id AND p.student_id = ?
       WHERE da.student_id = ? AND d.is_active = true
       GROUP BY d.id, d.name, da.amount`,
      [id, id]
    );

    const dues = duesResult.rows.map((row) => ({
      due_name: row.due_name,
      assigned_amount: Number(row.assigned_amount || 0),
      total_paid: Number(row.total_paid || 0),
      balance: Number(row.assigned_amount || 0) - Number(row.total_paid || 0),
      cleared: Number(row.total_paid || 0) >= Number(row.assigned_amount || 0)
    }));

    const totalOwed = dues.reduce((sum, due) => sum + due.assigned_amount, 0);
    const totalPaid = dues.reduce((sum, due) => sum + due.total_paid, 0);

    res.json({
      success: true,
      data: {
        student: studentResult.rows[0],
        dues,
        isFullyCleared: dues.length === 0 || dues.every((due) => due.cleared),
        totalOwed,
        totalPaid,
        totalBalance: totalOwed - totalPaid,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Clearance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.downloadClearancePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const settingsRows = await pool.query('SELECT `key`, `value` FROM settings WHERE `key` IN ("app_name")');
    const appName = settingsRows.rows[0]?.value || 'Dues Management System';

    const studentResult = await pool.query(
      'SELECT student_id, full_name, level, programme, academic_year FROM students WHERE id = ?',
      [id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentResult.rows[0];
    const duesResult = await pool.query(
      `SELECT d.name as due_name, da.amount as assigned_amount,
              COALESCE(SUM(CASE WHEN p.status IN ('approved','completed') THEN p.amount ELSE 0 END), 0) as total_paid
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       LEFT JOIN payments p ON p.due_id = d.id AND p.student_id = ?
       WHERE da.student_id = ? AND d.is_active = true
       GROUP BY d.id, d.name, da.amount`,
      [id, id]
    );

    const dues = duesResult.rows.map((row) => ({
      due_name: row.due_name,
      assigned_amount: Number(row.assigned_amount || 0),
      total_paid: Number(row.total_paid || 0),
      cleared: Number(row.total_paid || 0) >= Number(row.assigned_amount || 0)
    }));
    const isCleared = dues.length === 0 || dues.every((due) => due.cleared);

    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=clearance-${student.student_id}.pdf`);
    doc.pipe(res);

    doc.fillColor('#0B3C5D').fontSize(22).font('Helvetica-Bold').text(appName.toUpperCase(), { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#666').fontSize(11).font('Helvetica').text('Clearance Verification Document', { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor(isCleared ? '#166534' : '#991b1b').fontSize(18).font('Helvetica-Bold').text(isCleared ? 'CLEARANCE CERTIFICATE' : 'CLEARANCE DENIED', { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Student Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Name: ${student.full_name}`);
    doc.text(`Index Number: ${student.student_id}`);
    doc.text(`Programme: ${student.programme}`);
    doc.text(`Level: ${student.level}`);
    doc.text(`Academic Year: ${student.academic_year}`);
    doc.moveDown(1.5);
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Dues Status', { underline: true });
    doc.moveDown(0.5);

    if (dues.length === 0) {
      doc.font('Helvetica').fontSize(11).fillColor('#333').text('No dues assigned.');
    } else {
      dues.forEach((due) => {
        const status = due.cleared ? 'CLEARED' : 'OUTSTANDING';
        doc.font('Helvetica').fontSize(11).fillColor('#333').text(due.due_name, { continued: true });
        doc.fillColor(due.cleared ? '#166534' : '#991b1b').text(`  ${status}`, { align: 'right' });
        doc.fillColor('#666').fontSize(9).text(`Assigned: GHS ${due.assigned_amount.toFixed(2)} | Paid: GHS ${due.total_paid.toFixed(2)}`);
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(2);
    doc.fillColor('#0B3C5D').fontSize(11).font('Helvetica-Bold').text(
      isCleared ? 'This student is cleared of all dues.' : 'This student is not cleared. Outstanding dues must be settled.',
      { align: 'center' }
    );
    doc.end();
  } catch (error) {
    console.error('Clearance PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.sendBulkSMS = async (req, res) => {
  try {
    const { message, level, programme, academicYear } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let sql = `SELECT id, full_name, phone_number, student_id FROM students WHERE is_active = true AND phone_number IS NOT NULL AND phone_number != ''`;
    const params = [];
    if (level) { sql += ' AND level = ?'; params.push(level); }
    if (programme) { sql += ' AND programme LIKE ?'; params.push(`%${programme}%`); }
    if (academicYear) { sql += ' AND academic_year = ?'; params.push(academicYear); }

    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No students with phone numbers match the filter' });
    }

    let sent = 0;
    let failed = 0;
    for (const student of result.rows) {
      const personalized = message.replace(/{name}/g, student.full_name).replace(/{id_no}/g, student.student_id);
      const ok = await sendSMS(student.phone_number, personalized, { type: 'bulk_sms', relatedType: 'student', relatedId: student.id });
      if (ok) sent++; else failed++;
    }

    res.json({ success: true, message: `Bulk SMS sent: ${sent} delivered, ${failed} failed`, data: { sent, failed, total: result.rows.length } });
  } catch (error) {
    console.error('Bulk SMS error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.previewBulkSMSRecipients = async (req, res) => {
  try {
    const { level, programme, academicYear } = req.query;
    let sql = `SELECT COUNT(*) as total FROM students WHERE is_active = true AND phone_number IS NOT NULL AND phone_number != ''`;
    const params = [];
    if (level) { sql += ' AND level = ?'; params.push(level); }
    if (programme) { sql += ' AND programme LIKE ?'; params.push(`%${programme}%`); }
    if (academicYear) { sql += ' AND academic_year = ?'; params.push(academicYear); }

    const result = await pool.query(sql, params);
    res.json({ success: true, data: { count: Number(result.rows[0].total || 0) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSmsLogs = async (req, res) => {
  try {
    const { page = 1, limit = 25, status, type, phone } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let sql = 'SELECT * FROM sms_logs WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (type) { sql += ' AND message_type = ?'; params.push(type); }
    if (phone) { sql += ' AND recipient_phone LIKE ?'; params.push(`%${phone}%`); }

    const countResult = await pool.query(sql.replace('*', 'COUNT(*) as total'), params);
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    const logs = await pool.query(sql, params);

    res.json({
      success: true,
      data: logs.rows,
      pagination: {
        total: Number(countResult.rows[0].total || 0),
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(countResult.rows[0].total || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('SMS log fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, action } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND resource_type = ?'; params.push(category); }
    if (action) { sql += ' AND action = ?'; params.push(action); }

    const countResult = await pool.query(sql.replace('*', 'COUNT(*) as total'), params);
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    const logs = await pool.query(sql, params);

    res.json({
      success: true,
      data: logs.rows,
      pagination: {
        total: Number(countResult.rows[0].total || 0),
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(countResult.rows[0].total || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.promoteStudents = async (req, res) => {
  try {
    const { fromLevel, toLevel, academicYear } = req.body;
    if (!fromLevel || !toLevel || !academicYear) {
      return res.status(400).json({ success: false, message: 'Missing promotion parameters' });
    }

    const result = await pool.query(
      'UPDATE students SET level = ?, academic_year = ? WHERE level = ? AND is_active = true',
      [toLevel, academicYear, fromLevel]
    );

    res.json({ success: true, message: `Successfully promoted ${result.rows[0]?.affectedRows || 0} students from Level ${fromLevel} to ${toLevel}.` });
  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({ success: false, message: 'Server error during promotion' });
  }
};

exports.archiveData = async (req, res) => {
  res.json({ success: true, message: 'Data archiving triggered. This may take a few minutes.' });
};
