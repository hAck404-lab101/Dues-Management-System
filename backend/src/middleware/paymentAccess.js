const { pool } = require('../config/database');
const requirePermission = require('./requirePermission');

const requireOwnPaymentOrPermission = (...permissions) => {
  const staffPermission = requirePermission(...permissions);

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.role !== 'student') {
      return staffPermission(req, res, next);
    }

    try {
      const paymentId = req.params.id;
      if (!paymentId) {
        return res.status(400).json({ success: false, message: 'Payment ID is required' });
      }

      const result = await pool.query(
        `SELECT p.id
         FROM payments p
         INNER JOIN students s ON s.id = p.student_id
         WHERE p.id = ? AND s.user_id = ?
         LIMIT 1`,
        [paymentId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You do not have access to this payment' });
      }

      return next();
    } catch (error) {
      console.error('Payment ownership check error:', error);
      return res.status(500).json({ success: false, message: 'Unable to validate payment access' });
    }
  };
};

module.exports = { requireOwnPaymentOrPermission };
