const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const { sendExportEmail } = require('../utils/email');

const getBranding = async () => {
  const { rows } = await pool.query('SELECT `key`, `value` FROM settings WHERE `key` IN ("app_name", "app_description", "primary_color", "secondary_color")');
  const settings = {};
  rows.forEach(row => { settings[row.key] = row.value; });
  return {
    appName: settings.app_name || 'Dues Management System',
    appDescription: settings.app_description || 'Secure student dues, payments, and receipts portal',
    primaryColor: settings.primary_color || '#0B3C5D',
    secondaryColor: settings.secondary_color || '#F2A900'
  };
};

exports.getPaidStudents = async (req, res) => {
  try {
    const { level, programme, academicYear, dueId } = req.query;
    let query = `
      SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year,
             d.name as due_name, da.amount as assigned_amount,
             COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as total_paid
      FROM students s
      INNER JOIN due_assignments da ON da.student_id = s.id
      INNER JOIN dues d ON da.due_id = d.id
      LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = s.id
      WHERE s.is_active = true AND d.is_active = true
    `;
    const params = [];
    if (level) { query += ` AND s.level = ?`; params.push(level); }
    if (programme) { query += ` AND s.programme LIKE ?`; params.push(`%${programme}%`); }
    if (academicYear) { query += ` AND s.academic_year = ?`; params.push(academicYear); }
    if (dueId) { query += ` AND d.id = ?`; params.push(dueId); }
    query += `
      GROUP BY s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year, d.name, da.amount
      HAVING COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) >= da.amount
      ORDER BY s.full_name
    `;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows.map(row => ({ ...row, assigned_amount: parseFloat(row.assigned_amount), total_paid: parseFloat(row.total_paid) })) });
  } catch (error) {
    console.error('Get paid students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDefaulters = async (req, res) => {
  try {
    const { level, programme, academicYear, dueId } = req.query;
    let query = `
      SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year,
             d.name as due_name, da.amount as assigned_amount,
             COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as total_paid,
             da.amount - COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as balance
      FROM students s
      INNER JOIN due_assignments da ON da.student_id = s.id
      INNER JOIN dues d ON da.due_id = d.id
      LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = s.id
      WHERE s.is_active = true AND d.is_active = true
    `;
    const params = [];
    if (level) { query += ` AND s.level = ?`; params.push(level); }
    if (programme) { query += ` AND s.programme LIKE ?`; params.push(`%${programme}%`); }
    if (academicYear) { query += ` AND s.academic_year = ?`; params.push(academicYear); }
    if (dueId) { query += ` AND d.id = ?`; params.push(dueId); }
    query += `
      GROUP BY s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year, d.name, da.amount
      HAVING da.amount - COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) > 0
      ORDER BY balance DESC, s.full_name
    `;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows.map(row => ({ ...row, assigned_amount: parseFloat(row.assigned_amount), total_paid: parseFloat(row.total_paid), balance: parseFloat(row.balance) })) });
  } catch (error) {
    console.error('Get defaulters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, level, programme, academicYear } = req.query;
    let query = `
      SELECT d.name as due_name,
             COUNT(DISTINCT da.student_id) as total_students,
             COALESCE(SUM(da.amount), 0) as expected_revenue,
             COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as collected,
             COALESCE(SUM(da.amount), 0) - COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as outstanding
      FROM dues d
      LEFT JOIN due_assignments da ON da.due_id = d.id
      LEFT JOIN students s ON da.student_id = s.id
      LEFT JOIN payments p ON p.due_id = d.id AND p.student_id = s.id
      WHERE d.is_active = true
    `;
    const params = [];
    if (level) { query += ` AND s.level = ?`; params.push(level); }
    if (programme) { query += ` AND s.programme LIKE ?`; params.push(`%${programme}%`); }
    if (academicYear) { query += ` AND s.academic_year = ?`; params.push(academicYear); }
    if (startDate) { query += ` AND p.created_at >= ?`; params.push(startDate); }
    if (endDate) { query += ` AND p.created_at <= ?`; params.push(endDate); }
    query += ` GROUP BY d.id, d.name ORDER BY d.name`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows.map(row => ({ ...row, total_students: parseInt(row.total_students), expected_revenue: parseFloat(row.expected_revenue), collected: parseFloat(row.collected), outstanding: parseFloat(row.outstanding) })) });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const buildCsv = (data) => {
  const headers = Object.keys(data[0]);
  const escape = (value) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  return [headers.join(','), ...data.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
};

const buildPdfBuffer = async (data, reportType) => {
  const brand = await getBranding();
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.roundedRect(36, 36, 523, 82, 14).fill(brand.primaryColor);
  doc.fillColor('#FFFFFF').fontSize(19).font('Helvetica-Bold').text(brand.appName.toUpperCase(), 56, 58, { width: 483, align: 'center' });
  doc.fillColor('#E5E7EB').fontSize(10).font('Helvetica').text('Departmental Financial Report', 56, 86, { width: 483, align: 'center' });
  doc.moveDown(5);
  doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(`Report Type: ${String(reportType || '').replace(/-/g, ' ').toUpperCase()}`);
  doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(`Generated: ${new Date().toLocaleString('en-GH')}`);
  doc.moveDown();

  let columns = [];
  if (reportType === 'revenue') {
    columns = [{ label: 'Due Name', key: 'due_name', width: 150 }, { label: 'Students', key: 'total_students', width: 60 }, { label: 'Expected', key: 'expected_revenue', width: 90 }, { label: 'Collected', key: 'collected', width: 90 }, { label: 'Owed', key: 'outstanding', width: 90 }];
  } else if (reportType === 'paid-students') {
    columns = [{ label: 'Student Name', key: 'full_name', width: 140 }, { label: 'Index No', key: 'student_id', width: 80 }, { label: 'Lvl', key: 'level', width: 30 }, { label: 'Programme', key: 'programme', width: 150 }, { label: 'Paid', key: 'total_paid', width: 80 }];
  } else {
    columns = [{ label: 'Student Name', key: 'full_name', width: 140 }, { label: 'Index No', key: 'student_id', width: 80 }, { label: 'Due', key: 'due_name', width: 120 }, { label: 'Paid', key: 'total_paid', width: 70 }, { label: 'Bal', key: 'balance', width: 70 }];
  }

  doc.rect(50, doc.y, 500, 22).fill(brand.primaryColor);
  let x = 55;
  const headerY = doc.y - 17;
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
  columns.forEach(col => { doc.text(col.label, x, headerY); x += col.width; });

  let y = doc.y + 8;
  data.forEach((row, i) => {
    if (y > 750) { doc.addPage(); y = 50; }
    if (i % 2 === 0) doc.rect(50, y - 2, 500, 18).fill('#F5F5F5');
    doc.fillColor('#111827').fontSize(8).font('Helvetica');
    let drawX = 55;
    columns.forEach(col => {
      const raw = row[col.key];
      const value = typeof raw === 'number' ? raw.toFixed(2) : String(raw ?? '');
      doc.text(value, drawX, y, { width: col.width - 4 });
      drawX += col.width;
    });
    y += 18;
  });

  doc.end();
  return done;
};

exports.exportReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { reportType, emailTo, ...filters } = req.query;
    let data = [];
    const fakeRes = { json: (d) => { data = d.data || []; } };
    const fakeReq = { query: filters };

    if (reportType === 'paid-students') await exports.getPaidStudents(fakeReq, fakeRes);
    else if (reportType === 'defaulters') await exports.getDefaulters(fakeReq, fakeRes);
    else if (reportType === 'revenue') await exports.getRevenueReport(fakeReq, fakeRes);
    else return res.status(400).json({ success: false, message: 'Invalid report type' });

    if (data.length === 0) return res.status(400).json({ success: false, message: 'No data to export for current filters' });

    const brand = await getBranding();
    const safeReportType = String(reportType).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const filename = `${brand.appName.replace(/[^A-Za-z0-9]/g, '-')}-${safeReportType}-${Date.now()}.${type}`;
    let buffer;
    let contentType;

    if (type === 'csv') {
      buffer = Buffer.from(buildCsv(data), 'utf8');
      contentType = 'text/csv';
    } else if (type === 'pdf') {
      buffer = await buildPdfBuffer(data, reportType);
      contentType = 'application/pdf';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    if (emailTo) {
      const result = await sendExportEmail(emailTo, req.user?.email || 'Admin', `${reportType} ${type.toUpperCase()} Export`, [{ filename, content: buffer, contentType }]);
      if (!result.success) return res.status(502).json({ success: false, message: result.error || 'Failed to email export' });
      return res.json({ success: true, message: `Export emailed to ${emailTo}` });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(buffer);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
