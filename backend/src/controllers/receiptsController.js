const { pool } = require('../config/database');
const receiptService = require('../services/receiptService');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ADMIN_ROLES = ['admin', 'treasurer', 'financial_secretary', 'president'];

const canAccessReceiptRow = async (user, receipt) => {
  if (!user || !receipt) return false;
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (user.role !== 'student') return false;
  const result = await pool.query('SELECT id FROM students WHERE id = ? AND user_id = ?', [receipt.student_id, user.id]);
  return result.rows.length > 0;
};

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

const regenerateReceiptPdf = async (receipt) => {
  const brand = await getBranding();
  const safeReceiptNumber = String(receipt.receipt_number).replace(/[^A-Za-z0-9-]/g, '');
  const receiptDir = path.join(__dirname, '../../receipts');
  if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });
  const filepath = path.join(receiptDir, `receipt-${safeReceiptNumber}.pdf`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  const totalAmount = Number(receipt.total_amount || 0);
  const amountPaid = Number(receipt.amount_paid || 0);
  const balance = Number(receipt.balance || 0);

  doc.roundedRect(36, 36, 523, 94, 16).fill(brand.primaryColor);
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text(brand.appName.toUpperCase(), 56, 58, { width: 483, align: 'center' });
  doc.fillColor('#E5E7EB').fontSize(10).font('Helvetica').text(brand.appDescription, 56, 88, { width: 483, align: 'center' });
  doc.fillColor(brand.secondaryColor).fontSize(12).font('Helvetica-Bold').text('OFFICIAL PAYMENT RECEIPT', 56, 110, { width: 483, align: 'center' });

  doc.moveDown(6);
  doc.fillColor('#111827').fontSize(16).font('Helvetica-Bold').text('Payment Receipt', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#6B7280')
    .text(`Receipt No: ${receipt.receipt_number}`, 50, 165)
    .text(`Date: ${new Date(receipt.issued_at || Date.now()).toLocaleDateString('en-GH')}`, 350, 165, { align: 'right' });

  const section = (title, y) => {
    doc.roundedRect(50, y, 495, 28, 8).fill('#F3F4F6');
    doc.fillColor(brand.primaryColor).fontSize(11).font('Helvetica-Bold').text(title, 65, y + 9);
  };
  const label = (text, x, y) => doc.fillColor('#6B7280').fontSize(9).font('Helvetica-Bold').text(text, x, y);
  const value = (text, x, y, opts = {}) => doc.fillColor('#111827').fontSize(11).font('Helvetica').text(String(text || ''), x, y, opts);

  section('Student Details', 195);
  label('Name', 65, 238); value(receipt.full_name, 65, 252, { width: 210 });
  label('Index Number', 315, 238); value(receipt.index_number || receipt.student_id, 315, 252, { width: 210 });
  label('Level', 65, 290); value(receipt.level, 65, 304, { width: 210 });
  label('Programme', 315, 290); value(receipt.programme, 315, 304, { width: 210 });

  section('Payment Details', 395);
  label('Due Name', 65, 438); value(receipt.due_name, 65, 452, { width: 210 });
  label('Receipt Number', 315, 438); value(receipt.receipt_number, 315, 452, { width: 210 });

  section('Amount Summary', 545);
  label('Total Due Amount', 65, 588); value(`GHS ${totalAmount.toFixed(2)}`, 65, 602, { width: 160 });
  label('Amount Paid', 245, 588); doc.fillColor(brand.primaryColor).fontSize(13).font('Helvetica-Bold').text(`GHS ${amountPaid.toFixed(2)}`, 245, 600, { width: 130 });
  label('Balance', 400, 588); doc.fillColor(balance <= 0 ? '#166534' : '#B45309').fontSize(13).font('Helvetica-Bold').text(`GHS ${balance.toFixed(2)}`, 400, 600, { width: 120 });

  doc.fillColor('#6B7280').fontSize(9).font('Helvetica').text('This receipt was securely regenerated from verified payment records.', 50, 700, { align: 'center' });
  doc.fillColor('#6B7280').fontSize(8).font('Helvetica').text('This is a computer-generated receipt. No signature required.', 50, 780, { align: 'center' });
  doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica').text(`${brand.appName} • Digital Receipt System`, 50, 793, { align: 'center' });

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return filepath;
};

exports.getReceipts = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { studentId, dueId } = req.query;
    let query = `
      SELECT r.id, r.receipt_number, r.amount_paid, r.balance, r.total_amount,
             r.issued_at,
             s.student_id, s.full_name as student_name,
             d.name as due_name
      FROM receipts r
      INNER JOIN students s ON r.student_id = s.id
      INNER JOIN dues d ON r.due_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (userRole === 'student') { query += ` AND s.user_id = ?`; params.push(userId); }
    if (studentId) { query += ` AND r.student_id = ?`; params.push(studentId); }
    if (dueId) { query += ` AND r.due_id = ?`; params.push(dueId); }
    query += ` ORDER BY r.issued_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, s.student_id as index_number, s.full_name, s.email, s.level, s.programme, s.academic_year,
              d.name as due_name
       FROM receipts r
       INNER JOIN students s ON r.student_id = s.id
       INNER JOIN dues d ON r.due_id = d.id
       WHERE r.id = ?`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Receipt not found' });
    const receipt = result.rows[0];
    if (!(await canAccessReceiptRow(req.user, receipt))) return res.status(403).json({ success: false, message: 'Access denied' });
    delete receipt.receipt_url;
    delete receipt.qr_code_data;
    res.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getReceiptByNumber = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const receipt = await receiptService.getReceiptByNumber(receiptNumber);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    res.json({ success: true, data: {
      receipt_number: receipt.receipt_number,
      amount_paid: receipt.amount_paid,
      balance: receipt.balance,
      total_amount: receipt.total_amount,
      issued_at: receipt.issued_at,
      student_id: receipt.student_id,
      full_name: receipt.full_name,
      level: receipt.level,
      programme: receipt.programme,
      due_name: receipt.due_name
    }});
  } catch (error) {
    console.error('Get receipt by number error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const receipt = await receiptService.getReceiptByNumber(receiptNumber);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    if (!(await canAccessReceiptRow(req.user, receipt))) return res.status(403).json({ success: false, message: 'Access denied' });
    const filepath = await regenerateReceiptPdf(receipt);
    const safeReceiptNumber = String(receiptNumber).replace(/[^A-Za-z0-9-]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${safeReceiptNumber}.pdf"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
