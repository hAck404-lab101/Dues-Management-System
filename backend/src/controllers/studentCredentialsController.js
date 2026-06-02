const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { generateUUID } = require('../utils/uuid');
const { sendSMS } = require('../services/notificationService');

const generateTemporaryPassword = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '@#$';
  const pick = (chars, count) => Array.from({ length: count }, () => chars[crypto.randomInt(0, chars.length)]).join('');
  return `${pick(letters, 4)}${pick(numbers, 3)}${pick(symbols, 1)}`;
};

const getSetting = async (key, fallback = '') => {
  const result = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', [key]);
  return result.rows[0]?.value || fallback;
};

exports.resetStudentCredentials = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { password } = req.body || {};

    const studentResult = await pool.query(
      `SELECT s.id, s.user_id, s.student_id, s.full_name, s.email, s.phone_number, u.id AS existing_user_id
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id OR u.student_id = s.student_id
       WHERE s.id = ?`,
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentResult.rows[0];

    if (!student.phone_number) {
      return res.status(400).json({ success: false, message: 'Student has no phone number for SMS delivery' });
    }

    const tempPassword = password && password.length >= 6 ? password : generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const userId = student.existing_user_id || student.user_id || generateUUID();

    await connection.beginTransaction();

    if (student.existing_user_id || student.user_id) {
      await connection.query(
        `UPDATE users
         SET email = ?, password_hash = ?, role = 'student', student_id = ?, is_active = true, must_change_password = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR student_id = ?`,
        [student.email, passwordHash, student.student_id, userId, student.student_id]
      );
    } else {
      await connection.query(
        `INSERT INTO users (id, email, password_hash, role, student_id, is_active, must_change_password)
         VALUES (?, ?, ?, 'student', ?, true, true)`,
        [userId, student.email, passwordHash, student.student_id]
      );
    }

    await connection.query(
      'UPDATE students SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId, id]
    );

    await connection.query(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, new_values, ip_address, user_agent)
       VALUES (?, ?, 'RESET_STUDENT_CREDENTIALS', 'student', ?, ?, ?, ?)`,
      [
        generateUUID(),
        req.user?.id || null,
        id,
        JSON.stringify({ student_id: student.student_id, delivery: 'sms', must_change_password: true }),
        req.ip || null,
        req.headers['user-agent'] || null
      ]
    );

    await connection.commit();

    const template = await getSetting(
      'sms_credentials_template',
      'Hello {name}, your student portal login has been reset. Login ID: {login}. Temporary password: {password}. Please change it after login.'
    );

    const appName = await getSetting('app_name', 'Dues Management System');
    const smsMessage = template
      .replace(/{name}/g, student.full_name)
      .replace(/{login}/g, student.student_id)
      .replace(/{email}/g, student.email)
      .replace(/{password}/g, tempPassword)
      .replace(/{app_name}/g, appName);

    const smsSent = await sendSMS(student.phone_number, smsMessage, { type: 'student_credentials', relatedType: 'student', relatedId: student.id });

    res.json({
      success: true,
      message: smsSent
        ? 'Student login credentials reset and sent by SMS successfully'
        : 'Student login credentials reset, but SMS could not be sent. Check SMS settings/API key.',
      data: {
        student_id: student.student_id,
        phone_number: student.phone_number,
        sms_sent: smsSent,
        login: student.student_id,
        must_change_password: true,
        ...(process.env.NODE_ENV !== 'production' ? { temporary_password: tempPassword } : {})
      }
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Reset student credentials error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset student credentials' });
  } finally {
    connection.release();
  }
};
