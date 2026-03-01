const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateUUID } = require('../utils/uuid');

exports.getAllStudents = async (req, res) => {
  try {
    const { level, programme, academicYear, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, 
             s.academic_year, s.phone_number, s.is_active, s.created_at,
             u.id as user_id
      FROM students s
      LEFT JOIN users u ON s.student_id = u.student_id
      WHERE 1=1
    `;
    const params = [];

    if (level) {
      query += ` AND s.level = ?`;
      params.push(level);
    }
    if (programme) {
      query += ` AND s.programme LIKE ?`;
      params.push(`%${programme}%`);
    }
    if (academicYear) {
      query += ` AND s.academic_year = ?`;
      params.push(academicYear);
    }
    if (search) {
      query += ` AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Total count
    let countQuery = `SELECT COUNT(*) as total FROM students s WHERE 1=1`;
    const countParams = [];

    if (level) { countQuery += ` AND s.level = ?`; countParams.push(level); }
    if (programme) { countQuery += ` AND s.programme LIKE ?`; countParams.push(`%${programme}%`); }
    if (academicYear) { countQuery += ` AND s.academic_year = ?`; countParams.push(academicYear); }
    if (search) {
      countQuery += ` AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Students can only view their own profile
    if (userRole === 'student') {
      const studentCheck = await pool.query(
        'SELECT id FROM students WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      if (studentCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const result = await pool.query(
      `SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, 
             s.academic_year, s.phone_number, s.is_active, s.created_at,
             u.id as user_id
      FROM students s
      LEFT JOIN users u ON s.student_id = u.student_id
      WHERE s.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, 
              s.academic_year, s.phone_number, s.is_active, s.created_at
       FROM students s
       WHERE s.user_id = ?`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phoneNumber } = req.body;

    const updateFields = [];
    const params = [];

    if (fullName !== undefined) { updateFields.push('full_name = ?'); params.push(fullName); }
    if (phoneNumber !== undefined) { updateFields.push('phone_number = ?'); params.push(phoneNumber); }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const conn = await pool.getConnection();
    const [updateResult] = await conn.query(
      `UPDATE students SET ${updateFields.join(', ')} WHERE user_id = ?`,
      [...params, userId]
    );
    conn.release();

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const result = await pool.query(
      'SELECT id, student_id, full_name, email, level, programme, academic_year, phone_number FROM students WHERE user_id = ?',
      [userId]
    );

    res.json({ success: true, message: 'Profile updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Update my profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



exports.createStudent = async (req, res) => {
  try {
    const { studentId, fullName, email, level, programme, academicYear, phoneNumber, password } = req.body;

    const existing = await pool.query(
      'SELECT id FROM students WHERE student_id = ? OR email = ?',
      [studentId, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Student ID or email already exists' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let userId = null;
      const newStudentId = generateUUID();

      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        userId = generateUUID();
        await connection.query(
          `INSERT INTO users (id, email, password_hash, role, student_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, email, passwordHash, 'student', studentId, true]
        );
      }

      await connection.query(
        `INSERT INTO students (id, user_id, student_id, full_name, email, level, programme, academic_year, phone_number, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newStudentId, userId, studentId, fullName, email, level, programme, academicYear, phoneNumber || null, true]
      );

      const [studentRows] = await connection.query(
        'SELECT id, student_id, full_name, email, level, programme, academic_year FROM students WHERE id = ?',
        [newStudentId]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: studentRows[0]
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, level, programme, academicYear, phoneNumber } = req.body;

    const updateFields = [];
    const params = [];

    if (fullName !== undefined) { updateFields.push('full_name = ?'); params.push(fullName); }
    if (email !== undefined) { updateFields.push('email = ?'); params.push(email); }
    if (level !== undefined) { updateFields.push('level = ?'); params.push(level); }
    if (programme !== undefined) { updateFields.push('programme = ?'); params.push(programme); }
    if (academicYear !== undefined) { updateFields.push('academic_year = ?'); params.push(academicYear); }
    if (phoneNumber !== undefined) { updateFields.push('phone_number = ?'); params.push(phoneNumber); }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const conn = await pool.getConnection();
    const [updateResult] = await conn.query(
      `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    conn.release();

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // If email was changed, also update the users table so login still works
    if (email !== undefined) {
      const studentRow = await pool.query('SELECT student_id FROM students WHERE id = ?', [id]);
      if (studentRow.rows.length > 0) {
        await pool.query('UPDATE users SET email = ? WHERE student_id = ?', [email, studentRow.rows[0].student_id]);
      }
    }

    const result = await pool.query(
      'SELECT id, student_id, full_name, email, level, programme, academic_year, phone_number FROM students WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Student updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.activateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const conn = await pool.getConnection();
    const [updateResult] = await conn.query(
      'UPDATE students SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    conn.release();

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const result = await pool.query(
      'SELECT id, student_id, full_name, is_active FROM students WHERE id = ?',
      [id]
    );

    // Also activate associated user
    await pool.query(
      'UPDATE users SET is_active = true WHERE student_id = (SELECT student_id FROM students WHERE id = ?)',
      [id]
    );

    res.json({ success: true, message: 'Student activated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Activate student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deactivateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const conn = await pool.getConnection();
    const [updateResult] = await conn.query(
      'UPDATE students SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    conn.release();

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const result = await pool.query(
      'SELECT id, student_id, full_name, is_active FROM students WHERE id = ?',
      [id]
    );

    // Also deactivate associated user
    await pool.query(
      'UPDATE users SET is_active = false WHERE student_id = (SELECT student_id FROM students WHERE id = ?)',
      [id]
    );

    res.json({ success: true, message: 'Student deactivated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Deactivate student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteStudent = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    // Get user_id first
    const [student] = await connection.query('SELECT user_id, student_id FROM students WHERE id = ?', [id]);
    if (student.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const { user_id } = student[0];

    // If there's a user account, delete it (this will cascade delete the student entry)
    if (user_id) {
      await connection.query('DELETE FROM users WHERE id = ?', [user_id]);
    } else {
      // If no user account, delete student directly
      await connection.query('DELETE FROM students WHERE id = ?', [id]);
    }

    await connection.commit();
    res.json({ success: true, message: 'Student and associated data deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

exports.bulkDeleteStudents = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No student IDs provided' });
    }

    await connection.beginTransaction();

    // Get all user_ids for these students
    const [students] = await connection.query('SELECT user_id FROM students WHERE id IN (?)', [ids]);
    const userIds = students.map(s => s.user_id).filter(Boolean);

    // Delete users (triggers cascade delete for students)
    if (userIds.length > 0) {
      await connection.query('DELETE FROM users WHERE id IN (?)', [userIds]);
    }

    // Delete remaining students (those without user accounts)
    await connection.query('DELETE FROM students WHERE id IN (?)', [ids]);

    await connection.commit();
    res.json({ success: true, message: `${ids.length} students deleted successfully` });
  } catch (error) {
    await connection.rollback();
    console.error('Bulk delete students error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};
