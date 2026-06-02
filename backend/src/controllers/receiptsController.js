const { pool } = require('../config/database');
const receiptService = require('../services/receiptService');
const fs = require('fs');
const path = require('path');

const ADMIN_ROLES = ['admin', 'treasurer', 'financial_secretary', 'president'];

const canAccessReceiptRow = async (user, receipt) => {
  if (!user || !receipt) return false;
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (user.role !== 'student') return false;

  const result = await pool.query(
    'SELECT id FROM students WHERE id = ? AND user_id = ?',
    [receipt.student_id, user.id]
  );
  return result.rows.length > 0;
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

    if (userRole === 'student') {
      query += ` AND s.user_id = ?`;
      params.push(userId);
    }
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

    res.json({
      success: true,
      data: {
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
      }
    });
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

    const safeReceiptNumber = String(receiptNumber).replace(/[^A-Za-z0-9-]/g, '');
    const filepath = path.join(__dirname, '../../receipts', `receipt-${safeReceiptNumber}.pdf`);

    if (!fs.existsSync(filepath)) return res.status(404).json({ success: false, message: 'Receipt file not found. Please contact admin to regenerate the receipt.' });

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
