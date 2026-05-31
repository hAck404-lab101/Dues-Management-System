const { pool } = require('../config/database');

const successfulPaymentStatuses = "('approved', 'completed')";

const getStudentProfile = async (userId) => {
  const result = await pool.query(
    'SELECT id, student_id, full_name, email, level, programme, academic_year, phone_number FROM students WHERE user_id = ?',
    [userId]
  );
  return result.rows[0] || null;
};

exports.getAdminSummary = async (req, res) => {
  try {
    const [students, dues, assigned, collected, pendingManual, byProgramme, byLevel] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM students WHERE is_active = true'),
      pool.query('SELECT COUNT(*) AS total FROM dues WHERE is_active = true'),
      pool.query('SELECT COALESCE(SUM(amount), 0) AS total FROM due_assignments'),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status IN ${successfulPaymentStatuses}`),
      pool.query("SELECT COUNT(*) AS total FROM payments WHERE payment_type = 'manual' AND status = 'pending'"),
      pool.query(`
        SELECT s.programme,
               COUNT(DISTINCT s.id) AS students,
               COALESCE(SUM(da.amount), 0) AS expected,
               COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) AS collected
        FROM students s
        LEFT JOIN due_assignments da ON da.student_id = s.id
        LEFT JOIN payments p ON p.student_id = s.id AND p.due_id = da.due_id
        WHERE s.is_active = true
        GROUP BY s.programme
        ORDER BY s.programme
      `),
      pool.query(`
        SELECT s.level,
               COUNT(DISTINCT s.id) AS students,
               COALESCE(SUM(da.amount), 0) AS expected,
               COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) AS collected
        FROM students s
        LEFT JOIN due_assignments da ON da.student_id = s.id
        LEFT JOIN payments p ON p.student_id = s.id AND p.due_id = da.due_id
        WHERE s.is_active = true
        GROUP BY s.level
        ORDER BY s.level
      `)
    ]);

    const expected = Number(assigned.rows[0].total || 0);
    const totalCollected = Number(collected.rows[0].total || 0);

    res.json({
      success: true,
      data: {
        students: Number(students.rows[0].total || 0),
        active_dues: Number(dues.rows[0].total || 0),
        expected,
        collected: totalCollected,
        outstanding: Math.max(expected - totalCollected, 0),
        pending_manual_payments: Number(pendingManual.rows[0].total || 0),
        by_programme: byProgramme.rows.map((row) => ({
          ...row,
          expected: Number(row.expected || 0),
          collected: Number(row.collected || 0),
          outstanding: Math.max(Number(row.expected || 0) - Number(row.collected || 0), 0)
        })),
        by_level: byLevel.rows.map((row) => ({
          ...row,
          expected: Number(row.expected || 0),
          collected: Number(row.collected || 0),
          outstanding: Math.max(Number(row.expected || 0) - Number(row.collected || 0), 0)
        }))
      }
    });
  } catch (error) {
    console.error('Feature admin summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to load admin summary' });
  }
};

exports.getStudentDues = async (req, res) => {
  try {
    const student = await getStudentProfile(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const result = await pool.query(
      `SELECT d.id AS due_id,
              d.name,
              d.description,
              d.academic_year,
              d.deadline,
              d.late_fee,
              da.amount AS assigned_amount,
              COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) AS total_paid,
              MAX(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) AS has_pending_payment
       FROM due_assignments da
       INNER JOIN dues d ON d.id = da.due_id
       LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = da.student_id
       WHERE da.student_id = ? AND d.is_active = true
       GROUP BY d.id, d.name, d.description, d.academic_year, d.deadline, d.late_fee, da.amount
       ORDER BY d.created_at DESC`,
      [student.id]
    );

    const dues = result.rows.map((due) => {
      const assignedAmount = Number(due.assigned_amount || 0);
      const paid = Number(due.total_paid || 0);
      const lateFee = Number(due.late_fee || 0);
      const isOverdue = due.deadline ? new Date(due.deadline) < new Date() && paid < assignedAmount : false;
      const totalDue = assignedAmount + (isOverdue ? lateFee : 0);
      const balance = Math.max(totalDue - paid, 0);

      return {
        ...due,
        assigned_amount: assignedAmount,
        late_fee: lateFee,
        total_due: totalDue,
        total_paid: paid,
        balance,
        is_overdue: isOverdue,
        payment_status: balance <= 0 ? 'paid' : paid > 0 ? 'partial' : due.has_pending_payment ? 'pending_review' : 'unpaid'
      };
    });

    res.json({ success: true, student, data: dues });
  } catch (error) {
    console.error('Feature student dues error:', error);
    res.status(500).json({ success: false, message: 'Failed to load student dues' });
  }
};

exports.getManualPaymentQueue = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id,
              p.amount,
              p.payment_method,
              p.payment_type,
              p.status,
              p.proof_image_url,
              p.notes,
              p.created_at,
              s.student_id,
              s.full_name,
              s.email,
              s.level,
              s.programme,
              d.name AS due_name
       FROM payments p
       INNER JOIN students s ON s.id = p.student_id
       INNER JOIN dues d ON d.id = p.due_id
       WHERE p.payment_type = 'manual' AND p.status = 'pending'
       ORDER BY p.created_at ASC`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Manual queue error:', error);
    res.status(500).json({ success: false, message: 'Failed to load manual payment queue' });
  }
};

exports.getPaymentHealth = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status, payment_type, COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount
       FROM payments
       GROUP BY status, payment_type
       ORDER BY payment_type, status`
    );

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        ...row,
        total: Number(row.total || 0),
        amount: Number(row.amount || 0)
      }))
    });
  } catch (error) {
    console.error('Payment health error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payment health' });
  }
};
