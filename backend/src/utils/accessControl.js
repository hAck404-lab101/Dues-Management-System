const { pool } = require('../config/database');

const ADMIN_ROLES = ['admin', 'treasurer', 'financial_secretary', 'president'];

const isAdminRole = (role) => ADMIN_ROLES.includes(role);

const getAuthenticatedStudent = async (userId) => {
  const result = await pool.query(
    'SELECT id, user_id, student_id, full_name, email, level, programme, academic_year, phone_number FROM students WHERE user_id = ?',
    [userId]
  );
  return result.rows[0] || null;
};

const canAccessStudentRecord = async (user, studentRecordId) => {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (user.role !== 'student') return false;

  const result = await pool.query(
    'SELECT id FROM students WHERE id = ? AND user_id = ?',
    [studentRecordId, user.id]
  );
  return result.rows.length > 0;
};

const canAccessPayment = async (user, paymentId) => {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (user.role !== 'student') return false;

  const result = await pool.query(
    `SELECT p.id
     FROM payments p
     INNER JOIN students s ON s.id = p.student_id
     WHERE p.id = ? AND s.user_id = ?`,
    [paymentId, user.id]
  );
  return result.rows.length > 0;
};

const canAccessReceipt = async (user, receiptId) => {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (user.role !== 'student') return false;

  const result = await pool.query(
    `SELECT r.id
     FROM receipts r
     INNER JOIN students s ON s.id = r.student_id
     WHERE r.id = ? AND s.user_id = ?`,
    [receiptId, user.id]
  );
  return result.rows.length > 0;
};

const requirePaymentAccess = async (req, res, next) => {
  try {
    const allowed = await canAccessPayment(req.user, req.params.id);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });
    next();
  } catch (error) {
    console.error('Payment access check error:', error);
    res.status(500).json({ success: false, message: 'Access check failed' });
  }
};

const requireReceiptAccess = async (req, res, next) => {
  try {
    const allowed = await canAccessReceipt(req.user, req.params.id);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });
    next();
  } catch (error) {
    console.error('Receipt access check error:', error);
    res.status(500).json({ success: false, message: 'Access check failed' });
  }
};

const requireStudentRecordAccess = async (req, res, next) => {
  try {
    const allowed = await canAccessStudentRecord(req.user, req.params.id);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });
    next();
  } catch (error) {
    console.error('Student record access check error:', error);
    res.status(500).json({ success: false, message: 'Access check failed' });
  }
};

module.exports = {
  ADMIN_ROLES,
  isAdminRole,
  getAuthenticatedStudent,
  canAccessStudentRecord,
  canAccessPayment,
  canAccessReceipt,
  requirePaymentAccess,
  requireReceiptAccess,
  requireStudentRecordAccess
};
