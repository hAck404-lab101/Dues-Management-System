const { pool } = require('../config/database');

exports.getMyProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access required' });
    }

    const result = await pool.query(
      `SELECT id, student_id, full_name, email, phone_number, level, programme,
              academic_year, is_active, created_at, updated_at
       FROM students
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get student self profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access required' });
    }

    const fullName = String(req.body?.fullName || '').trim();
    const phoneNumber = String(req.body?.phoneNumber || '').trim();

    if (!fullName) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    await pool.query(
      `UPDATE students
       SET full_name = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [fullName, phoneNumber || null, req.user.id]
    );

    const result = await pool.query(
      `SELECT id, student_id, full_name, email, phone_number, level, programme,
              academic_year, is_active, created_at, updated_at
       FROM students
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    return res.json({ success: true, message: 'Profile updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Update student self profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};
