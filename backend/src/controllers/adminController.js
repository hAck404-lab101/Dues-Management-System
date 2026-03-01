const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateUUID } = require('../utils/uuid');
const { sendSMS } = require('../services/notificationService');

/**
 * Bulk import students from CSV data sent as JSON array
 * Body: { students: [{indexNumber, fullName, email, level, programme, academicYear, phoneNumber, password}] }
 */
exports.bulkImportStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'No student data provided' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    // Fetch valid programmes and years for validation
    const { rows: settingsRows } = await pool.query(
      'SELECT `key`, `value` FROM settings WHERE `key` IN ("available_programmes", "available_academic_years")'
    );
    const settingsMap = {};
    settingsRows.forEach(s => settingsMap[s.key] = s.value || '');

    const validProgrammes = settingsMap.available_programmes?.split(',').map(p => p.trim().toLowerCase()).filter(Boolean) || [];
    const validYears = settingsMap.available_academic_years?.split(',').map(y => y.trim().toLowerCase()).filter(Boolean) || [];

    for (const s of students) {
      const { indexNumber, fullName, email, level, programme, academicYear, phoneNumber, password } = s;
      if (!indexNumber || !fullName || !email || !level || !programme || !academicYear) {
        results.errors.push(`Row skipped (missing required fields): ${indexNumber || email || 'unknown'}`);
        results.skipped++;
        continue;
      }

      // Validate Programme
      if (validProgrammes.length > 0 && !validProgrammes.includes(programme.trim().toLowerCase())) {
        results.errors.push(`${indexNumber} — Invalid programme: "${programme}". Pick from system settings.`);
        results.skipped++;
        continue;
      }

      // Validate Academic Year
      if (validYears.length > 0 && !validYears.includes(academicYear.trim().toLowerCase())) {
        results.errors.push(`${indexNumber} — Invalid academic year: "${academicYear}". Pick from system settings.`);
        results.skipped++;
        continue;
      }

      try {
        const existing = await pool.query(
          'SELECT id FROM students WHERE student_id = ? OR email = ?',
          [indexNumber, email]
        );
        if (existing.rows.length > 0) {
          results.errors.push(`${indexNumber} (${fullName}) — already exists, skipped`);
          results.skipped++;
          continue;
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
          const newStudentId = generateUUID();
          let userId = null;
          const defaultPassword = password || indexNumber; // Use index number as default password
          const passwordHash = await bcrypt.hash(defaultPassword, 10);
          userId = generateUUID();
          await connection.query(
            `INSERT INTO users (id, email, password_hash, role, student_id, is_active) VALUES (?, ?, ?, 'student', ?, true)`,
            [userId, email, passwordHash, indexNumber]
          );
          await connection.query(
            `INSERT INTO students (id, user_id, student_id, full_name, email, level, programme, academic_year, phone_number, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
            [newStudentId, userId, indexNumber, fullName, email, level, programme, academicYear, phoneNumber || null]
          );
          await connection.commit();
          results.created++;
        } catch (err) {
          await connection.rollback();
          results.errors.push(`${indexNumber} — DB error: ${err.message}`);
          results.skipped++;
        } finally {
          connection.release();
        }
      } catch (err) {
        results.errors.push(`${indexNumber} — error: ${err.message}`);
        results.skipped++;
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
      data: results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, message: 'Server error during import' });
  }
};

/**
 * Generate a student clearance certificate
 * Returns JSON with clearance status, or could generate a PDF
 */
exports.getStudentClearance = async (req, res) => {
  try {
    const { id } = req.params;

    const studentResult = await pool.query(
      `SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year, s.phone_number
       FROM students s WHERE s.id = ?`,
      [id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // Find all dues assigned to this student
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

    const dues = duesResult.rows.map(row => ({
      due_name: row.due_name,
      assigned_amount: parseFloat(row.assigned_amount),
      total_paid: parseFloat(row.total_paid),
      balance: parseFloat(row.assigned_amount) - parseFloat(row.total_paid),
      cleared: parseFloat(row.total_paid) >= parseFloat(row.assigned_amount)
    }));

    const isFullyCleared = dues.length === 0 || dues.every(d => d.cleared);
    const totalOwed = dues.reduce((sum, d) => sum + d.assigned_amount, 0);
    const totalPaid = dues.reduce((sum, d) => sum + d.total_paid, 0);
    const totalBalance = totalOwed - totalPaid;

    res.json({
      success: true,
      data: {
        student,
        dues,
        isFullyCleared,
        totalOwed,
        totalPaid,
        totalBalance,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Clearance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Download clearance certificate as PDF
 */
exports.downloadClearancePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const PDFDocument = require('pdfkit');
    const { rows: settingsRows } = await pool.query('SELECT `key`, `value` FROM settings WHERE category = "sys_appearance"');
    const settings = {};
    settingsRows.forEach(s => settings[s.key] = s.value);
    const appName = settings.app_name || 'UCC DEPARTMENTAL DUES';

    const studentResult = await pool.query(
      'SELECT s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year FROM students s WHERE s.id = ?',
      [id]
    );
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
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

    const dues = duesResult.rows.map(r => ({
      due_name: r.due_name,
      assigned_amount: parseFloat(r.assigned_amount),
      total_paid: parseFloat(r.total_paid),
      cleared: parseFloat(r.total_paid) >= parseFloat(r.assigned_amount)
    }));
    const isCleared = dues.length === 0 || dues.every(d => d.cleared);

    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=clearance-${student.student_id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fillColor('#0B3C5D').fontSize(22).font('Helvetica-Bold').text(appName.toUpperCase(), { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#666').fontSize(11).font('Helvetica').text('University of Cape Coast', { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor(isCleared ? '#166534' : '#991b1b').fontSize(18).font('Helvetica-Bold')
      .text(isCleared ? '✓ CLEARANCE CERTIFICATE' : '✗ CLEARANCE DENIED', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#888').fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-GH')}`, { align: 'center' });
    doc.moveDown(1.5);

    // Student details
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Student Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Name: ${student.full_name}`);
    doc.text(`Index Number: ${student.student_id}`);
    doc.text(`Programme: ${student.programme}`);
    doc.text(`Level: ${student.level}`);
    doc.text(`Academic Year: ${student.academic_year}`);
    doc.moveDown(1.5);

    // Dues breakdown
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Dues Status', { underline: true });
    doc.moveDown(0.5);

    if (dues.length === 0) {
      doc.font('Helvetica').fontSize(11).fillColor('#333').text('No dues assigned.');
    } else {
      dues.forEach(d => {
        const status = d.cleared ? '✓ CLEARED' : '✗ OUTSTANDING';
        const color = d.cleared ? '#166534' : '#991b1b';
        doc.font('Helvetica').fontSize(11).fillColor('#333').text(`• ${d.due_name}`, { continued: true });
        doc.fillColor(color).text(`  ${status}`, { align: 'right' });
        doc.fillColor('#666').fontSize(9).text(`   Assigned: GH₵${d.assigned_amount.toFixed(2)}  |  Paid: GH₵${d.total_paid.toFixed(2)}`);
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(2);
    doc.fillColor('#0B3C5D').fontSize(11).font('Helvetica-Bold')
      .text(isCleared ? 'This student is cleared of all departmental dues.' : 'This student is NOT cleared. Outstanding dues must be settled.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Clearance PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Send bulk SMS to filtered students
 * Body: { message, level, programme, academicYear, dueId (optional) }
 */
exports.sendBulkSMS = async (req, res) => {
  try {
    const { message, level, programme, academicYear, dueId } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let query = `SELECT s.id, s.full_name, s.phone_number, s.student_id FROM students s WHERE s.is_active = true AND s.phone_number IS NOT NULL AND s.phone_number != ''`;
    const params = [];

    if (level) { query += ` AND s.level = ?`; params.push(level); }
    if (programme) { query += ` AND s.programme LIKE ?`; params.push(`%${programme}%`); }
    if (academicYear) { query += ` AND s.academic_year = ?`; params.push(academicYear); }

    const result = await pool.query(query, params);
    const students = result.rows;

    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No students with phone numbers match the filter' });
    }

    let sent = 0, failed = 0;
    for (const s of students) {
      const personalizedMsg = message
        .replace(/{name}/g, s.full_name)
        .replace(/{id_no}/g, s.student_id);
      const ok = await sendSMS(s.phone_number, personalizedMsg);
      if (ok) sent++; else failed++;
    }

    res.json({
      success: true,
      message: `Bulk SMS sent: ${sent} delivered, ${failed} failed`,
      data: { sent, failed, total: students.length }
    });
  } catch (error) {
    console.error('Bulk SMS error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get count of students that would receive a bulk SMS (for preview)
 */
exports.previewBulkSMSRecipients = async (req, res) => {
  try {
    const { level, programme, academicYear } = req.query;
    let query = `SELECT COUNT(*) as total FROM students WHERE is_active = true AND phone_number IS NOT NULL AND phone_number != ''`;
    const params = [];
    if (level) { query += ` AND level = ?`; params.push(level); }
    if (programme) { query += ` AND programme LIKE ?`; params.push(`%${programme}%`); }
    if (academicYear) { query += ` AND academic_year = ?`; params.push(academicYear); }

    const result = await pool.query(query, params);
    res.json({ success: true, data: { count: parseInt(result.rows[0].total) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get audit logs with pagination and filters
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, action } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND resource_type = ?';
      params.push(category);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    const countResult = await pool.query(query.replace('*', 'COUNT(*) as total'), params);
    const total = parseInt(countResult.rows[0].total);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Promote students from one level to the next (e.g. 100 -> 200)
 */
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

    res.json({
      success: true,
      message: `Successfully promoted ${result.rows.affectedRows} students from Level ${fromLevel} to ${toLevel}.`
    });
  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({ success: false, message: 'Server error during promotion' });
  }
};

/**
 * Mock function for data archive
 */
exports.archiveData = async (req, res) => {
  res.json({ success: true, message: 'Data archiving triggered. This may take a few minutes.' });
};
