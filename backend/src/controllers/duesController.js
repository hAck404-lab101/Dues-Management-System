const { pool } = require('../config/database');
const { sendDueNotificationEmail } = require('../utils/email');
const { generateUUID } = require('../utils/uuid');

exports.getAllDues = async (req, res) => {
  try {
    const { academicYear, isActive, studentId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let query = `
      SELECT d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description, 
             d.is_active, d.created_at, d.updated_at,
             u.email as created_by_email
      FROM dues d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (academicYear) {
      query += ` AND d.academic_year = ?`;
      params.push(academicYear);
    }
    if (isActive !== undefined) {
      query += ` AND d.is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }
    if (userRole === 'student' && studentId) {
      query += ` AND EXISTS (
        SELECT 1 FROM due_assignments da
        INNER JOIN students s ON da.student_id = s.id
        WHERE da.due_id = d.id AND s.user_id = ?
      )`;
      params.push(userId);
    }

    query += ` ORDER BY d.created_at DESC`;
    const result = await pool.query(query, params);

    // For students, include payment status
    if (userRole === 'student' && studentId) {
      for (let due of result.rows) {
        const studentResult = await pool.query(
          `SELECT s.id FROM students s WHERE s.user_id = ?`,
          [userId]
        );
        if (studentResult.rows.length > 0) {
          const sId = studentResult.rows[0].id;
          const assignmentResult = await pool.query(
            `SELECT amount FROM due_assignments WHERE due_id = ? AND student_id = ?`,
            [due.id, sId]
          );
          if (assignmentResult.rows.length > 0) {
            due.assigned_amount = parseFloat(assignmentResult.rows[0].amount);
            const paymentResult = await pool.query(
              `SELECT COALESCE(SUM(amount), 0) as total_paid
               FROM payments
               WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
              [due.id, sId]
            );
            const totalPaid = parseFloat(paymentResult.rows[0].total_paid);
            due.total_paid = totalPaid;

            // Calculate late fee if applicable
            let effectiveAssignedAmount = due.assigned_amount;
            const now = new Date();
            if (due.deadline && new Date(due.deadline) < now && totalPaid < due.assigned_amount) {
              effectiveAssignedAmount += parseFloat(due.late_fee || 0);
              due.is_overdue = true;
            } else {
              due.is_overdue = false;
            }

            due.balance = effectiveAssignedAmount - totalPaid;
            due.payment_status = due.balance <= 0 ? 'paid' : due.balance < effectiveAssignedAmount ? 'partial' : 'pending';
          }
        }
      }
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get dues error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDueById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description, 
              d.is_active, d.created_at, d.updated_at,
              u.email as created_by_email
       FROM dues d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Due not found' });
    }

    const due = result.rows[0];

    if (userRole === 'student') {
      const studentResult = await pool.query(
        `SELECT s.id FROM students s WHERE s.user_id = ?`,
        [userId]
      );
      if (studentResult.rows.length > 0) {
        const sId = studentResult.rows[0].id;
        const assignmentResult = await pool.query(
          `SELECT amount FROM due_assignments WHERE due_id = ? AND student_id = ?`,
          [id, sId]
        );
        if (assignmentResult.rows.length > 0) {
          due.assigned_amount = parseFloat(assignmentResult.rows[0].amount);
          const paymentResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total_paid
             FROM payments
             WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
            [id, sId]
          );
          const totalPaid = parseFloat(paymentResult.rows[0].total_paid);
          due.total_paid = totalPaid;

          // Calculate late fee if applicable
          let effectiveAssignedAmount = due.assigned_amount;
          const now = new Date();
          if (due.deadline && new Date(due.deadline) < now && totalPaid < due.assigned_amount) {
            effectiveAssignedAmount += parseFloat(due.late_fee || 0);
            due.is_overdue = true;
          } else {
            due.is_overdue = false;
          }

          due.balance = effectiveAssignedAmount - totalPaid;
          due.payment_status = due.balance <= 0 ? 'paid' : due.balance < effectiveAssignedAmount ? 'partial' : 'pending';
        }
      }
    }

    res.json({ success: true, data: due });
  } catch (error) {
    console.error('Get due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDueStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    let query = `
      SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year,
             da.amount as assigned_amount,
             COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as total_paid,
             da.amount - COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as balance
      FROM due_assignments da
      INNER JOIN students s ON da.student_id = s.id
      LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = s.id
      WHERE da.due_id = ?
      GROUP BY s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year, da.amount
    `;
    const params = [id];

    if (status) {
      query += ` HAVING `;
      if (status === 'paid') {
        query += `COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) >= da.amount`;
      } else if (status === 'partial') {
        query += `COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) > 0 
                  AND COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) < da.amount`;
      } else if (status === 'pending') {
        query += `COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) = 0`;
      }
    }

    query += ` ORDER BY s.full_name`;
    const result = await pool.query(query, params);

    const students = result.rows.map(row => ({
      ...row,
      assigned_amount: parseFloat(row.assigned_amount),
      total_paid: parseFloat(row.total_paid),
      balance: parseFloat(row.balance),
      payment_status: row.balance <= 0 ? 'paid' : row.total_paid > 0 ? 'partial' : 'pending'
    }));

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Get due students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createDue = async (req, res) => {
  try {
    const { name, amount, academicYear, deadline, description, lateFee } = req.body;
    const userId = req.user.id;

    if (!name || !amount || !academicYear) {
      return res.status(400).json({ success: false, message: 'Name, amount, and academic year are required' });
    }

    const newId = generateUUID();
    await pool.query(
      `INSERT INTO dues (id, name, amount, academic_year, deadline, description, late_fee, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, name, amount, academicYear, deadline || null, description || null, lateFee || 0, true, userId]
    );

    const result = await pool.query(
      'SELECT id, name, amount, academic_year, deadline, late_fee, description, is_active, created_at FROM dues WHERE id = ?',
      [newId]
    );

    res.status(201).json({ success: true, message: 'Due created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Create due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateDue = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, academicYear, deadline, description, lateFee } = req.body;

    const updateFields = [];
    const params = [];

    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (amount !== undefined) { updateFields.push('amount = ?'); params.push(amount); }
    if (academicYear !== undefined) { updateFields.push('academic_year = ?'); params.push(academicYear); }
    if (deadline !== undefined) { updateFields.push('deadline = ?'); params.push(deadline || null); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
    if (lateFee !== undefined) { updateFields.push('late_fee = ?'); params.push(lateFee); }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const conn = await pool.getConnection();
    const [updateResult] = await conn.query(
      `UPDATE dues SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    conn.release();

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Due not found' });
    }

    const result = await pool.query(
      'SELECT id, name, amount, academic_year, deadline, late_fee, description, is_active FROM dues WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Due updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Update due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.assignDue = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, amount } = req.body;

    let assignmentAmount = amount;
    if (!assignmentAmount) {
      const dueResult = await pool.query('SELECT amount FROM dues WHERE id = ?', [id]);
      if (dueResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Due not found' });
      }
      assignmentAmount = dueResult.rows[0].amount;
    }

    const assignId = generateUUID();
    await pool.query(
      `INSERT INTO due_assignments (id, due_id, student_id, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [assignId, id, studentId, assignmentAmount]
    );

    const result = await pool.query(
      'SELECT id, due_id, student_id, amount FROM due_assignments WHERE due_id = ? AND student_id = ?',
      [id, studentId]
    );

    // Send notification email
    const studentResult = await pool.query(
      `SELECT s.*, d.name as due_name, d.amount as due_amount, d.deadline, d.description
       FROM students s
       CROSS JOIN dues d
       WHERE s.id = ? AND d.id = ?`,
      [studentId, id]
    );

    if (studentResult.rows.length > 0) {
      const student = studentResult.rows[0];
      const due = {
        name: student.due_name,
        amount: assignmentAmount,
        deadline: student.deadline,
        description: student.description
      };
      await sendDueNotificationEmail(student, due).catch(err => console.error('Email error:', err));
    }

    res.status(201).json({ success: true, message: 'Due assigned successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Assign due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.bulkAssignDue = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, programme, academicYear, amount } = req.body;

    let assignmentAmount = amount;
    if (!assignmentAmount) {
      const dueResult = await pool.query('SELECT amount FROM dues WHERE id = ?', [id]);
      if (dueResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Due not found' });
      }
      assignmentAmount = dueResult.rows[0].amount;
    }

    let query = 'SELECT id FROM students WHERE is_active = true';
    const params = [];

    if (level) { query += ` AND level = ?`; params.push(level); }
    if (programme) { query += ` AND programme = ?`; params.push(programme); }
    if (academicYear) { query += ` AND academic_year = ?`; params.push(academicYear); }

    const studentsResult = await pool.query(query, params);
    const studentIds = studentsResult.rows.map(row => row.id);

    if (studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No students found matching criteria' });
    }

    // Bulk insert with ON DUPLICATE KEY UPDATE (MySQL syntax)
    const placeholders = studentIds.map(() => '(UUID(), ?, ?, ?)').join(', ');
    const bulkParams = studentIds.flatMap(sId => [id, sId, assignmentAmount]);

    await pool.query(
      `INSERT INTO due_assignments (id, due_id, student_id, amount)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      bulkParams
    );

    res.json({
      success: true,
      message: `Due assigned to ${studentIds.length} students successfully`,
      count: studentIds.length
    });
  } catch (error) {
    console.error('Bulk assign due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.activateDue = async (req, res) => {
  try {
    const { id } = req.params;

    const conn = await pool.getConnection();
    const [updateResult] = await conn.query(
      'UPDATE dues SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    conn.release();

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Due not found' });
    }

    const result = await pool.query('SELECT id, name, is_active FROM dues WHERE id = ?', [id]);
    res.json({ success: true, message: 'Due activated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Activate due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deactivateDue = async (req, res) => {
  try {
    const { id } = req.params;

    const conn = await pool.getConnection();
    const [updateResult] = await conn.query(
      'UPDATE dues SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    conn.release();

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Due not found' });
    }

    const result = await pool.query('SELECT id, name, is_active FROM dues WHERE id = ?', [id]);
    res.json({ success: true, message: 'Due deactivated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Deactivate due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteDue = async (req, res) => {
  try {
    const { id } = req.params;

    const paymentsResult = await pool.query(
      'SELECT COUNT(*) as total FROM payments WHERE due_id = ?',
      [id]
    );

    if (parseInt(paymentsResult.rows[0].total) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete due with existing payments' });
    }

    const dueResult = await pool.query('SELECT id, name FROM dues WHERE id = ?', [id]);
    if (dueResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Due not found' });
    }

    await pool.query('DELETE FROM dues WHERE id = ?', [id]);

    res.json({ success: true, message: 'Due deleted successfully' });
  } catch (error) {
    console.error('Delete due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
