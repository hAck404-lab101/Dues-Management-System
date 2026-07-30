const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { generateUUID } = require('../utils/uuid');
const { sendSMS } = require('../services/notificationService');
const { sendSignupEmail } = require('../utils/email');

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

const cleanOtp = (value = '') => String(value || '').replace(/[^0-9]/g, '').trim();

const findStudentUserByIdentity = async (identityValue = '') => {
  const cleanIdentity = String(identityValue || '').trim();
  if (!cleanIdentity) return null;

  const indexResult = await pool.query(
    `SELECT u.id, u.email, u.student_id, u.otp_code, u.otp_expires,
            s.id as student_record_id, s.full_name, s.phone_number
     FROM users u
     INNER JOIN students s ON u.student_id = s.student_id
     WHERE u.role = 'student' AND (u.student_id = ? OR s.student_id = ?)
     LIMIT 1`,
    [cleanIdentity, cleanIdentity]
  );
  if (indexResult.rows.length > 0) {
    return { ...indexResult.rows[0], normalizedPhone: normalizePhone(indexResult.rows[0].phone_number) };
  }

  if (looksLikePhone(cleanIdentity)) {
    const normalizedIdentityPhone = normalizePhone(cleanIdentity);
    const phoneResult = await pool.query(
      `SELECT u.id, u.email, u.student_id, u.otp_code, u.otp_expires,
              s.id as student_record_id, s.full_name, s.phone_number
       FROM users u
       INNER JOIN students s ON u.student_id = s.student_id
       WHERE u.role = 'student' AND s.phone_number IS NOT NULL`
    );
    const matched = phoneResult.rows.find((row) => normalizePhone(row.phone_number) === normalizedIdentityPhone) || null;
    return matched ? { ...matched, normalizedPhone: normalizedIdentityPhone } : null;
  }

  return null;
};

const getRolePermissions = async (role) => {
  if (role === 'admin') {
    const { rows } = await pool.query('SELECT DISTINCT `key` as permission_key FROM permissions');
    return rows.map(r => r.permission_key);
  }
  const { rows } = await pool.query('SELECT permission_key FROM role_permissions WHERE role = ?', [role]);
  return rows.map(r => r.permission_key);
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
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });

    const { indexNumber, email, password } = req.body;
    let userResult;
    if (email) {
      userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.student_id, u.is_active, u.must_change_password,
                s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year, s.phone_number
         FROM users u LEFT JOIN students s ON u.student_id = s.student_id WHERE u.email = ?`,
        [email]
      );
    } else if (indexNumber) {
      userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.student_id, u.is_active, u.must_change_password,
                s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year, s.phone_number
         FROM users u LEFT JOIN students s ON u.student_id = s.student_id WHERE u.student_id = ? OR s.student_id = ?`,
        [indexNumber, indexNumber]
      );
    } else {
      return res.status(400).json({ success: false, message: 'Email or index number is required' });
    }

    if (userResult.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const user = userResult.rows[0];
    if (!user.is_active) return res.status(401).json({ success: false, message: 'Account is deactivated' });
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user.id, user.role);
    const permissions = await getRolePermissions(user.role);
    res.json({ success: true, message: 'Login successful', token, user: { ...userPayload(user), permissions } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.register = async (req, res) => {
  // Student self-registration is permanently disabled.
  // Students must be imported by an admin using the bulk import feature.
  return res.status(403).json({
    success: false,
    message: 'Student self-registration is not allowed. Please contact your administrator.'
  });
};



exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    const identityValue = String(req.body.identity || req.body.indexNumber || req.body.phoneNumber || '').trim();
    if (!identityValue) return res.status(400).json({ success: false, message: 'Index number or phone number is required' });

    const matchedUser = await findStudentUserByIdentity(identityValue);
    if (!matchedUser) return res.status(404).json({ success: false, message: 'No matching student account found. Check the index number or phone number.' });
    if (!matchedUser.normalizedPhone) return res.status(400).json({ success: false, message: 'No phone number is associated with this account. Please contact an administrator.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000);
    await pool.query('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, matchedUser.id]);
    const message = `Your password reset code is ${otp}. It expires in 10 minutes.`;
    const smsSent = await sendSMS(matchedUser.normalizedPhone, message, { type: 'password_reset_otp', relatedType: 'student', relatedId: matchedUser.student_record_id });
    if (!smsSent) return res.status(502).json({ success: false, message: 'The account was found, but SMS failed to send. Please contact an administrator or try again.' });
    res.json({ success: true, message: 'Verification code sent to the registered phone number', contact: maskPhone(matchedUser.normalizedPhone), identity: matchedUser.student_id });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { identity, otp } = req.body;
    const cleanIdentity = String(identity || '').trim();
    const submittedOtp = cleanOtp(otp);
    if (!submittedOtp || !cleanIdentity) return res.status(400).json({ success: false, message: 'Identity and verification code are required' });

    const user = await findStudentUserByIdentity(cleanIdentity);
    if (!user) return res.status(400).json({ success: false, message: 'Invalid verification request' });

    const storedOtp = cleanOtp(user.otp_code);
    if (!storedOtp || storedOtp !== submittedOtp) return res.status(400).json({ success: false, message: 'Invalid verification code' });
    if (!user.otp_expires || new Date(user.otp_expires) < new Date()) return res.status(400).json({ success: false, message: 'Verification code has expired' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60000);
    await pool.query('UPDATE users SET reset_password_token = ?, reset_password_expires = ?, otp_code = NULL, otp_expires = NULL WHERE id = ?', [resetToken, resetExpires, user.id]);
    res.json({ success: true, message: 'Verification code confirmed', resetToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const userResult = await pool.query('SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()', [token]);
    if (userResult.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL, must_change_password = true WHERE id = ?', [passwordHash, userResult.rows[0].id]);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    const { currentPassword, newPassword } = req.body;
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ?, must_change_password = false WHERE id = ?', [passwordHash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.role, u.student_id, u.is_active, u.must_change_password,
              s.id as student_record_id, s.full_name, s.level, s.programme, s.academic_year, s.phone_number
       FROM users u LEFT JOIN students s ON u.student_id = s.student_id WHERE u.id = ?`,
      [req.user.id]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const user = userResult.rows[0];
    const permissions = await getRolePermissions(user.role);
    res.json({ success: true, user: { ...userPayload(user), permissions } });
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
