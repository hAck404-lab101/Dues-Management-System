const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, role, student_id, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

const isAdmin = authorize('admin', 'treasurer', 'financial_secretary', 'president');
const isStudent = authorize('student');
const isTreasurer = authorize('admin', 'treasurer', 'president');
const isFinancialSecretary = authorize('admin', 'financial_secretary', 'treasurer', 'president');
const isPresident = authorize('admin', 'president');

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  isStudent,
  isTreasurer,
  isFinancialSecretary,
  isPresident
};

