const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');
const { generateUUID } = require('../utils/uuid');
const { sendSMS } = require('../services/notificationService');

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { indexNumber, email, password } = req.body;

    let userResult;
    if (email) {
      userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.student_id, u.is_active,
                s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year
         FROM users u
         LEFT JOIN students s ON u.student_id = s.student_id
         WHERE u.email = ?`,
        [email]
      );
    } else if (indexNumber) {
      userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.student_id, u.is_active,
                s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year
         FROM users u
         LEFT JOIN students s ON u.student_id = s.student_id
         WHERE u.student_id = ? OR s.student_id = ?`,
        [indexNumber, indexNumber]
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Email or index number is required'
      });
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    const userInfo = {
      id: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student_id,
      ...(user.student_record_id && {
        student: {
          id: user.student_record_id,
          fullName: user.full_name,
          level: user.level,
          programme: user.programme,
          academicYear: user.academic_year
        }
      })
    };

    res.json({ success: true, message: 'Login successful', token, user: userInfo });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { indexNumber, fullName, phoneNumber, email, password, programme, academicYear } = req.body;

    // Fetch valid programmes and years for validation
    const { rows: settingsRows } = await pool.query(
      'SELECT `key`, `value` FROM settings WHERE `key` IN ("available_programmes", "available_academic_years", "registration_status")'
    );
    const settingsMap = {};
    settingsRows.forEach(s => settingsMap[s.key] = s.value);

    // Check if registration is open
    if (settingsMap.registration_status === 'closed') {
      return res.status(403).json({ success: false, message: 'Student registration is currently closed.' });
    }

    const validProgrammes = settingsMap.available_programmes?.split(',').map(p => p.trim().toLowerCase()).filter(Boolean) || [];
    const validYears = settingsMap.available_academic_years?.split(',').map(y => y.trim().toLowerCase()).filter(Boolean) || [];

    // Validate Programme
    if (validProgrammes.length > 0 && !validProgrammes.includes((programme || '').trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid programme selected. Please choose from the list.' });
    }

    // Validate Academic Year
    if (validYears.length > 0 && !validYears.includes((academicYear || '').trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid academic year selected. Please choose from the list.' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = ? OR student_id = ?',
      [email, indexNumber]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or Index Number already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const userId = generateUUID();
      const studentId = generateUUID();

      await connection.query(
        `INSERT INTO users (id, email, password_hash, role, student_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, email, passwordHash, 'student', indexNumber, true]
      );

      await connection.query(
        `INSERT INTO students (id, user_id, student_id, full_name, email, level, programme, academic_year, phone_number, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, userId, indexNumber, fullName, email, '100', programme, academicYear, phoneNumber, true]
      );

      const [studentRows] = await connection.query(
        'SELECT id, full_name, student_id, email FROM students WHERE id = ?',
        [studentId]
      );

      await connection.commit();

      const token = generateToken(userId, 'student');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: userId,
          email,
          role: 'student',
          studentId: indexNumber,
          student: {
            id: studentRows[0].id,
            fullName: studentRows[0].full_name,
            studentId: studentRows[0].student_id,
            email: studentRows[0].email
          }
        }
      });
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }

    const { indexNumber, phoneNumber } = req.body;

    let userResult;
    if (indexNumber) {
      userResult = await pool.query(
        `SELECT u.id, u.email, s.phone_number 
         FROM users u 
         LEFT JOIN students s ON u.student_id = s.student_id 
         WHERE u.student_id = ? OR s.student_id = ?`,
        [indexNumber, indexNumber]
      );
    } else if (phoneNumber) {
      userResult = await pool.query(
        `SELECT u.id, u.email, s.phone_number 
         FROM users u 
         LEFT JOIN students s ON u.student_id = s.student_id 
         WHERE s.phone_number = ?`,
        [phoneNumber]
      );
    }

    if (!userResult || userResult.rows.length === 0) {
      // For security, still return success
      return res.json({ success: true, message: 'If account exists, an OTP has been sent' });
    }

    const user = userResult.rows[0];
    const targetPhone = user.phone_number;

    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: 'No phone number associated with this account. Please contact admin.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutes

    await pool.query(
      'UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?',
      [otp, otpExpires, user.id]
    );

    const message = `Your password reset OTP is: ${otp}. Valid for 10 mins.`;
    const smsSent = await sendSMS(targetPhone, message);

    if (!smsSent) {
      console.warn(`Failed to send OTP to ${targetPhone}`);
      // Don't error out, maybe the provider is down but we recorded it
    }

    res.json({
      success: true,
      message: 'OTP sent to your registered phone number',
      contact: targetPhone.replace(/(\d{3})\d+(\d{2})/, '$1***$2')
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { identity, otp } = req.body;

    if (!identity || !otp) {
      return res.status(400).json({ success: false, message: 'Identity and OTP are required' });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.otp_code, u.otp_expires 
       FROM users u 
       LEFT JOIN students s ON u.student_id = s.student_id 
       WHERE u.student_id = ? OR s.student_id = ? OR s.phone_number = ?`,
      [identity, identity, identity]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const user = userResult.rows[0];

    if (user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date(user.otp_expires) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // OTP verified. Generate a one-time reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60000); // 10 mins to change password

    await pool.query(
      'UPDATE users SET reset_password_token = ?, reset_password_expires = ?, otp_code = NULL, otp_expires = NULL WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const userResult = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
      [passwordHash, userResult.rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.role, u.student_id, u.is_active,
              s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year, s.phone_number
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = ?`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];

    const userInfo = {
      id: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student_id,
      isActive: user.is_active,
      ...(user.student_record_id && {
        student: {
          id: user.student_record_id,
          fullName: user.full_name,
          level: user.level,
          programme: user.programme,
          academicYear: user.academic_year,
          phoneNumber: user.phone_number
        }
      })
    };

    res.json({ success: true, user: userInfo });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = generateToken(req.user.id, req.user.role);
    res.json({ success: true, token });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
