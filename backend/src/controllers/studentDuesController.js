const { pool } = require('../config/database');

const getStudentRecord = async (userId) => {
  const result = await pool.query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  return result.rows[0] || null;
};

exports.getAssignedDues = async (req, res) => {
  try {
    const student = await getStudentRecord(req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const result = await pool.query(
      `SELECT d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description,
              d.is_active, da.amount AS assigned_amount,
              COALESCE(SUM(CASE WHEN p.status IN ('approved','completed') THEN p.amount ELSE 0 END), 0) AS total_paid,
              da.amount - COALESCE(SUM(CASE WHEN p.status IN ('approved','completed') THEN p.amount ELSE 0 END), 0) AS balance
       FROM due_assignments da
       INNER JOIN dues d ON d.id = da.due_id
       LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = da.student_id
       WHERE da.student_id = ? AND d.is_active = true
       GROUP BY d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description, d.is_active, da.amount
       ORDER BY d.created_at DESC`,
      [student.id]
    );

    const data = result.rows.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
      assigned_amount: Number(row.assigned_amount || 0),
      total_paid: Number(row.total_paid || 0),
      balance: Number(row.balance || 0),
      payment_status: Number(row.balance || 0) <= 0 ? 'paid' : Number(row.total_paid || 0) > 0 ? 'partial' : 'pending'
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Get assigned dues error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load assigned dues' });
  }
};

exports.getAssignedDueById = async (req, res) => {
  try {
    const student = await getStudentRecord(req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const result = await pool.query(
      `SELECT d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description,
              d.is_active, da.amount AS assigned_amount,
              COALESCE(SUM(CASE WHEN p.status IN ('approved','completed') THEN p.amount ELSE 0 END), 0) AS total_paid,
              da.amount - COALESCE(SUM(CASE WHEN p.status IN ('approved','completed') THEN p.amount ELSE 0 END), 0) AS balance
       FROM due_assignments da
       INNER JOIN dues d ON d.id = da.due_id
       LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = da.student_id
       WHERE da.student_id = ? AND da.due_id = ? AND d.is_active = true
       GROUP BY d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description, d.is_active, da.amount
       LIMIT 1`,
      [student.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'This due is not assigned to your account' });
    }

    const row = result.rows[0];
    const data = {
      ...row,
      amount: Number(row.amount || 0),
      assigned_amount: Number(row.assigned_amount || 0),
      total_paid: Number(row.total_paid || 0),
      balance: Number(row.balance || 0),
      payment_status: Number(row.balance || 0) <= 0 ? 'paid' : Number(row.total_paid || 0) > 0 ? 'partial' : 'pending'
    };

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Get assigned due error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load due information' });
  }
};
