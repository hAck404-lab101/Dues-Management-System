const { pool } = require('../config/database');
const receiptService = require('../services/receiptService');
const fs = require('fs');
const path = require('path');

exports.getReceipts = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { studentId, dueId } = req.query;

    let query = `
      SELECT r.id, r.receipt_number, r.amount_paid, r.balance, r.total_amount, 
             r.receipt_url, r.issued_at,
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
    const userRole = req.user.role;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT r.*, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year,
              d.name as due_name
       FROM receipts r
       INNER JOIN students s ON r.student_id = s.id
       INNER JOIN dues d ON r.due_id = d.id
       WHERE r.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const receipt = result.rows[0];

    if (userRole === 'student') {
      const studentCheck = await pool.query(
        'SELECT user_id FROM students WHERE id = ?',
        [receipt.student_id]
      );
      if (studentCheck.rows[0].user_id !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

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

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Get receipt by number error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    const receipt = await receiptService.getReceiptByNumber(receiptNumber);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const filepath = path.join(__dirname, '../../receipts', `receipt-${receiptNumber}.pdf`);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'Receipt file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${receiptNumber}.pdf`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
