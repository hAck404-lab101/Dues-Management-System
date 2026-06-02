const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { generateUUID } = require('../utils/uuid');
const { sendSMS } = require('../services/notificationService');

const normalizePhone = (value = '') => {
  const raw = String(value).replace(/[^0-9]/g, '');
  if (!raw) return '';
  if (raw.startsWith('233')) return raw;
  if (raw.startsWith('0')) return `233${raw.slice(1)}`;
  return `233${raw}`;
};

const maskPhone = (value = '') => {
  const phone = normalizePhone(value);
  if (!phone || phone.length < 7) return 'your registered phone';
  return `${phone.slice(0, 5)}***${phone.slice(-2)}`;
};

const looksLikePhone = (value = '') => {
  const raw = String(value).replace(/[^0-9]/g, '');
  return raw.length >= 9 && raw.length <= 13;
};

const userPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  studentId: user.student_id,
  isActive: user.is_active,
  mustChangePassword: !!user.must_change_password,
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
});

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }

    const { indexNumber, email, password } = req.body;
    let userResult;

    if (email) {
      userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.student_id, u.is_active, u.must_change_password,
                s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year, s.phone_number
         FROM users u
         LEFT JOIN students s ON u.student_id = s.student_id
         WHERE u.email = ?`,
        [email]
      );
    } else if (indexNumber) {
      userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.student_id, u.is_active, u.must_change_password,
                s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year, s.phone_number
         FROM users u
         LEFT JOIN students s ON u.student_id = s.student_id
         WHERE u.student_id = ? OR s.student_id = ?`,
        [indexNumber, indexNumber]
      );
    } else {
      return res.status(400).json({ success: false, message: 'Email or index number is required' });
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
    res.json({ success: true, message: 'Login successful', token, user: userPayload(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }

    const { indexNumber, fullName, phoneNumber, email, password, programme, academicYear } = req.body;
    const { rows: settingsRows } = await pool.query(
      'SELECT `key`, `value` FROM settings WHERE `key` IN ("available_programmes", "available_academic_years", "registration_status")'
    );
    const settingsMap = {};
    settingsRows.forEach(s => settingsMap[s.key] = s.value);

    if (settingsMap.registration_status === 'closed') {
      return res.status(403).json({ success: false, message: 'Student registration is currently closed.' });
    }

    const validProgrammes = settingsMap.available_programmes?.split(',').map(p => p.trim().toLowerCase()).filter(Boolean) || [];
    const validYears = settingsMap.available_academic_years?.split(',').map(y => y.trim().toLowerCase()).filter(Boolean) || [];

    if (validProgrammes.length > 0 && !validProgrammes.includes((programme || '').trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid programme selected. Please choose from the list.' });
    }

    if (validYears.length > 0 && !validYears.includes((academicYear || '').trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid academic year selected. Please choose from the list.' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = ? OR student_id = ?', [email, indexNumber]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or Index Number already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const userId = generateUUID();
      const studentRecordId = generateUUID();

      await connection.query(
        `INSERT INTO users (id, email, password_hash, role, student_id, is_active, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?, false)`,
        [userId, email, passwordHash, 'student', indexNumber, true]
      );

      await connection.query(
        `INSERT INTO students (id, user_id, student_id, full_name, email, level, programme, academic_year, phone_number, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentRecordId, userId, indexNumber, fullName, email, '100', programme, academicYear, phoneNumber, true]
      );

      const [studentRows] = await connection.query('SELECT id, full_name, student_id, email FROM students WHERE id = ?', [studentRecordId]);
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
          isActive: true,
          mustChangePassword: false,
          student: {
            id: studentRows[0].id,
            fullName: studentRows[0].full_name,
            studentId: studentRows[0].student_id,
            email: studentRows[0].email
          }
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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

    const identityValue = String(req.body.identity || req.body.indexNumber || req.body.phoneNumber || '').trim();
    if (!identityValue) {
      return res.status(400).json({ success: false, message: 'Index number or phone number is required' });
    }

    const identityIsPhone = looksLikePhone(identityValue);
    const normalizedIdentityPhone = identityIsPhone ? normalizePhone(identityValue) : '';
    let matchedUser = null;

    if (identityIsPhone) {
      const phoneResult = await pool.query(
        `SELECT u.id, u.email, u.student_id, s.id as student_record_id, s.full_name, s.phone_number
         FROM users u
         INNER JOIN students s ON u.student_id = s.student_id
         WHERE u.role = 'student' AND s.phone_number IS NOT NULL`,
        []
      );
      matchedUser = phoneResult.rows.find((row) => normalizePhone(row.phone_number) === normalizedIdentityPhone) || null;
      if (matchedUser) matchedUser.normalizedPhone = normalizedIdentityPhone;
    } else {
      const result = await pool.query(
        `SELECT u.id, u.email, u.student_id, s.id as student_record_id, s.full_name, s.phone_number
         FROM users u
         INNER JOIN students s ON u.student_id = s.student_id
         WHERE u.role = 'student' AND (u.student_id = ? OR s.student_id = ?)`,
        [identityValue, identityValue]
      );
      if (result.rows.length > 0) {
        matchedUser = { ...result.rows[0], normalizedPhone: normalizePhone(result.rows[0].phone_number) };
      }
    }

    if (!matchedUser) {
      return res.status(404).json({ success: false, message: 'No matching student account found. Check the index number or phone number.' });
    }

    if (!matchedUser.normalizedPhone) {
      return res.status(400).json({ success: false, message: 'No phone number is associated with this account. Please contact an administrator.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000);

    await pool.query('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, matchedUser.id]);

    const message = `Your password reset code is ${otp}. It expires in 10 minutes.`;
    const smsSent = await sendSMS(matchedUser.normalizedPhone, message, { type: 'password_reset_otp', relatedType: 'student', relatedId: matchedUser.student_record_id });

    if (!smsSent) {
      return res.status(502).json({ success: false, message: 'The account was found, but SMS failed to send. Please contact an administrator or try again.' });
    }

    res.json({
      success: true,
      message: 'Verification code sent to the registered phone number',
      contact: maskPhone(matchedUser.normalizedPhone),
      identity: matchedUser.student_id
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { identity, otp } = req.body;
    const cleanIdentity = String(identity || '').trim();

    if (!otp || !cleanIdentity) {
      return res.status(400).json({ success: false, message: 'Identity and verification code are required' });
    }

    const identityIsPhone = looksLikePhone(cleanIdentity);
    let user = null;

    if (identityIsPhone) {
      const phoneResult = await pool.query(
        `SELECT u.id, u.otp_code, u.otp_expires, u.student_id, s.phone_number
         FROM users u
         INNER JOIN students s ON u.student_id = s.student_id
         WHERE u.role = 'student' AND s.phone_number IS NOT NULL`,
        []
      );
      user = phoneResult.rows.find((row) => normalizePhone(row.phone_number) === normalizePhone(cleanIdentity)) || null;
    } else {
      const userResult = await pool.query(
        `SELECT u.id, u.otp_code, u.otp_expires, u.student_id, s.phone_number
         FROM users u
         INNER JOIN students s ON u.student_id = s.student_id
         WHERE u.role = 'student' AND (u.student_id = ? OR s.student_id = ?)`,
        [cleanIdentity, cleanIdentity]
      );
      user = userResult.rows[0] || null;
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid verification request' });
    }

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    if (!user.otp_expires || new Date(user.otp_expires) < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60000);

    await pool.query(
      'UPDATE users SET reset_password_token = ?, reset_password_expires = ?, otp_code = NULL, otp_expires = NULL WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );

    res.json({ success: true, message: 'Verification code confirmed', resetToken });
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

    const userResult = await pool.query('SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()', [token]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL, must_change_password = true WHERE id = ?',
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

    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ?, must_change_password = false WHERE id = ?', [passwordHash, userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.role, u.student_id, u.is_active, u.must_change_password,
              s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year, s.phone_number
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = ?`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: userPayload(userResult.rows[0]) });
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
