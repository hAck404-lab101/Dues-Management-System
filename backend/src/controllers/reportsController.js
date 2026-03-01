const { pool } = require('../config/database');

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

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        assigned_amount: parseFloat(row.assigned_amount),
        total_paid: parseFloat(row.total_paid)
      }))
    });
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

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        assigned_amount: parseFloat(row.assigned_amount),
        total_paid: parseFloat(row.total_paid),
        balance: parseFloat(row.balance)
      }))
    });
  } catch (error) {
    console.error('Get defaulters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, level, programme, academicYear } = req.query;

    let query = `
      SELECT 
        d.name as due_name,
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

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        total_students: parseInt(row.total_students),
        expected_revenue: parseFloat(row.expected_revenue),
        collected: parseFloat(row.collected),
        outstanding: parseFloat(row.outstanding)
      }))
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const PDFDocument = require('pdfkit');

exports.exportReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { reportType, ...filters } = req.query;

    let data = [];
    const fakeRes = { json: (d) => { data = d.data || []; } };
    const fakeReq = { query: filters };

    if (reportType === 'paid-students') {
      await exports.getPaidStudents(fakeReq, fakeRes);
    } else if (reportType === 'defaulters') {
      await exports.getDefaulters(fakeReq, fakeRes);
    } else if (reportType === 'revenue') {
      await exports.getRevenueReport(fakeReq, fakeRes);
    }

    if (data.length === 0) {
      return res.status(400).json({ success: false, message: 'No data to export for current filters' });
    }

    if (type === 'csv') {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','));
      const csv = [headers, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=ucc-report-${reportType}-${Date.now()}.csv`);
      return res.send(csv);
    }

    if (type === 'pdf') {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ucc-report-${reportType}-${Date.now()}.pdf`);
      doc.pipe(res);

      // Header
      doc.fontSize(20).text('UNIVERSITY OF CAPE COAST', { align: 'center' });
      doc.fontSize(14).text('Departmental Financial Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Report Type: ${reportType.toUpperCase()}`, { align: 'left' });
      doc.text(`Generated Date: ${new Date().toLocaleString()}`, { align: 'left' });
      doc.moveDown();

      // Table Header Row
      doc.rect(50, doc.y, 500, 20).fill('#0d47a1');
      doc.fillColor('white').fontSize(9);

      let columns = [];
      if (reportType === 'revenue') {
        columns = [
          { label: 'Due Name', width: 150 },
          { label: 'Students', width: 60 },
          { label: 'Expected', width: 90 },
          { label: 'Collected', width: 90 },
          { label: 'Owed', width: 90 }
        ];
      } else if (reportType === 'paid-students') {
        columns = [
          { label: 'Student Name', width: 140 },
          { label: 'Index No', width: 80 },
          { label: 'Lvl', width: 30 },
          { label: 'Programme', width: 150 },
          { label: 'Paid', width: 80 }
        ];
      } else {
        columns = [
          { label: 'Student Name', width: 140 },
          { label: 'Index No', width: 80 },
          { label: 'Due', width: 120 },
          { label: 'Paid', width: 70 },
          { label: 'Bal', width: 70 }
        ];
      }

      let currentX = 55;
      columns.forEach(col => {
        doc.text(col.label, currentX, doc.y - 15);
        currentX += col.width;
      });

      // Data Rows
      doc.fillColor('black');
      let currentY = doc.y + 10;

      data.forEach((row, i) => {
        if (currentY > 750) {
          doc.addPage();
          currentY = 50;
        }

        if (i % 2 === 0) doc.rect(50, currentY - 2, 500, 18).fill('#f5f5f5');
        doc.fillColor('black');

        let drawX = 55;
        if (reportType === 'revenue') {
          doc.text(row.due_name, drawX, currentY); drawX += 150;
          doc.text(row.total_students.toString(), drawX, currentY); drawX += 60;
          doc.text(row.expected_revenue.toFixed(2), drawX, currentY); drawX += 90;
          doc.text(row.collected.toFixed(2), drawX, currentY); drawX += 90;
          doc.text(row.outstanding.toFixed(2), drawX, currentY);
        } else if (reportType === 'paid-students') {
          doc.text(row.full_name, drawX, currentY); drawX += 140;
          doc.text(row.student_id, drawX, currentY); drawX += 80;
          doc.text(row.level, drawX, currentY); drawX += 30;
          doc.text(row.programme, drawX, currentY, { width: 140 }); drawX += 150;
          doc.text(row.total_paid.toFixed(2), drawX, currentY);
        } else {
          doc.text(row.full_name, drawX, currentY); drawX += 140;
          doc.text(row.student_id, drawX, currentY); drawX += 80;
          doc.text(row.due_name, drawX, currentY, { width: 110 }); drawX += 120;
          doc.text(row.total_paid.toFixed(2), drawX, currentY); drawX += 70;
          doc.text(row.balance.toFixed(2), drawX, currentY);
        }

        currentY += 18;
      });

      doc.end();
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid export type' });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
