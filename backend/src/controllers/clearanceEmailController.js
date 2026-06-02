const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const { sendClearanceEmail } = require('../utils/email');

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

const getClearanceData = async (studentId) => {
  const studentResult = await pool.query(
    'SELECT student_id, full_name, email, level, programme, academic_year FROM students WHERE id = ?',
    [studentId]
  );
  if (studentResult.rows.length === 0) return null;

  const duesResult = await pool.query(
    `SELECT d.name as due_name, da.amount as assigned_amount,
            COALESCE(SUM(CASE WHEN p.status IN ('approved','completed') THEN p.amount ELSE 0 END), 0) as total_paid
     FROM due_assignments da
     INNER JOIN dues d ON da.due_id = d.id
     LEFT JOIN payments p ON p.due_id = d.id AND p.student_id = ?
     WHERE da.student_id = ? AND d.is_active = true
     GROUP BY d.id, d.name, da.amount`,
    [studentId, studentId]
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

  return {
    student: studentResult.rows[0],
    dues,
    isCleared: dues.length === 0 || dues.every(due => due.cleared),
    totalOwed,
    totalPaid,
    totalBalance: totalOwed - totalPaid
  };
};

const buildClearancePdfBuffer = async (clearance) => {
  const brand = await getBranding();
  const { student, dues, isCleared, totalOwed, totalPaid, totalBalance } = clearance;

  const doc = new PDFDocument({ size: 'A4', margin: 60 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.roundedRect(36, 36, 523, 94, 16).fill(brand.primaryColor);
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text(brand.appName.toUpperCase(), 56, 58, { width: 483, align: 'center' });
  doc.fillColor('#E5E7EB').fontSize(10).font('Helvetica').text(brand.appDescription, 56, 88, { width: 483, align: 'center' });
  doc.fillColor(brand.secondaryColor).fontSize(12).font('Helvetica-Bold').text('CLEARANCE VERIFICATION DOCUMENT', 56, 110, { width: 483, align: 'center' });

  doc.moveDown(6);
  doc.fillColor(isCleared ? '#166534' : '#991b1b').fontSize(20).font('Helvetica-Bold').text(isCleared ? 'CLEARANCE CERTIFICATE' : 'CLEARANCE NOT APPROVED', { align: 'center' });
  doc.moveDown(1.2);

  doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold').text('Student Information', { underline: true });
  doc.moveDown(0.5);
  doc.fillColor('#374151').fontSize(11).font('Helvetica');
  doc.text(`Name: ${student.full_name}`);
  doc.text(`Index Number: ${student.student_id}`);
  doc.text(`Programme: ${student.programme}`);
  doc.text(`Level: ${student.level}`);
  doc.text(`Academic Year: ${student.academic_year}`);

  doc.moveDown(1.2);
  doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold').text('Dues Breakdown', { underline: true });
  doc.moveDown(0.5);

  if (dues.length === 0) {
    doc.fillColor('#374151').fontSize(11).font('Helvetica').text('No dues assigned.');
  } else {
    dues.forEach((due) => {
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(due.due_name);
      doc.fillColor(due.cleared ? '#166534' : '#991b1b').fontSize(9).font('Helvetica').text(
        `${due.cleared ? 'CLEARED' : 'OUTSTANDING'} | Assigned: GHS ${due.assigned_amount.toFixed(2)} | Paid: GHS ${due.total_paid.toFixed(2)} | Balance: GHS ${due.balance.toFixed(2)}`
      );
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(1.2);
  doc.roundedRect(60, doc.y, 475, 70, 10).fill('#F9FAFB').stroke('#E5E7EB');
  const summaryY = doc.y + 14;
  doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(`Total Owed: GHS ${totalOwed.toFixed(2)}`, 80, summaryY);
  doc.text(`Total Paid: GHS ${totalPaid.toFixed(2)}`, 80, summaryY + 18);
  doc.fillColor(totalBalance <= 0 ? '#166534' : '#991b1b').text(`Balance: GHS ${totalBalance.toFixed(2)}`, 80, summaryY + 36);

  doc.moveDown(6);
  doc.fillColor(brand.primaryColor).fontSize(11).font('Helvetica-Bold').text(
    isCleared ? 'This student is cleared of all dues.' : 'This student is not cleared. Outstanding dues must be settled.',
    { align: 'center' }
  );
  doc.moveDown(0.8);
  doc.fillColor('#6B7280').fontSize(8).font('Helvetica').text('This is a computer-generated document. No signature required.', { align: 'center' });
  doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica').text(`${brand.appName} • Clearance System`, { align: 'center' });

  doc.end();
  return done;
};

exports.sendClearancePDFEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const clearance = await getClearanceData(id);
    if (!clearance) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!clearance.student.email) return res.status(400).json({ success: false, message: 'Student has no email address' });

    const pdfBuffer = await buildClearancePdfBuffer(clearance);
    const statusText = clearance.isCleared ? 'Cleared' : 'Not Cleared';
    const result = await sendClearanceEmail(clearance.student, statusText, [{
      filename: `clearance-${clearance.student.student_id}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]);

    if (!result.success) return res.status(502).json({ success: false, message: result.error || 'Failed to send clearance email' });
    res.json({ success: true, message: `Clearance PDF emailed to ${clearance.student.full_name}` });
  } catch (error) {
    console.error('Send clearance email error:', error);
    res.status(500).json({ success: false, message: 'Server error while sending clearance email' });
  }
};
