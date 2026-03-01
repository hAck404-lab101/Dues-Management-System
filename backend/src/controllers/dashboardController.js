const { pool } = require('../config/database');

exports.getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const studentResult = await pool.query(
      'SELECT id, student_id, full_name, level, programme, academic_year FROM students WHERE user_id = ?',
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const student = studentResult.rows[0];

    const duesResult = await pool.query(
      `SELECT COUNT(*) as total_count, COALESCE(SUM(da.amount), 0) as total_amount
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       WHERE da.student_id = ? AND d.is_active = true`,
      [student.id]
    );

    const totalDues = parseInt(duesResult.rows[0].total_count);
    const totalDuesAmount = parseFloat(duesResult.rows[0].total_amount);

    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total_paid
       FROM payments p
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.student_id = ? AND p.status IN ('approved', 'completed') AND d.is_active = true`,
      [student.id]
    );

    const totalPaid = parseFloat(paidResult.rows[0].total_paid);
    const outstandingBalance = totalDuesAmount - totalPaid;

    const recentPaymentsResult = await pool.query(
      `SELECT p.id, p.amount, p.payment_method, p.status, p.created_at,
              d.name as due_name
       FROM payments p
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.student_id = ?
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [student.id]
    );

    const recentReceiptsResult = await pool.query(
      `SELECT r.id, r.receipt_number, r.amount_paid, r.issued_at,
              d.name as due_name
       FROM receipts r
       INNER JOIN dues d ON r.due_id = d.id
       WHERE r.student_id = ?
       ORDER BY r.issued_at DESC
       LIMIT 5`,
      [student.id]
    );

    const duesStatusResult = await pool.query(
      `SELECT d.id, d.name, d.amount, d.deadline, da.amount as assigned_amount,
              COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as total_paid,
              da.amount - COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as balance
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = da.student_id
       WHERE da.student_id = ? AND d.is_active = true
       GROUP BY d.id, d.name, d.amount, d.deadline, da.amount
       ORDER BY d.created_at DESC`,
      [student.id]
    );

    const duesWithStatus = duesStatusResult.rows.map(due => ({
      ...due,
      assigned_amount: parseFloat(due.assigned_amount),
      total_paid: parseFloat(due.total_paid),
      balance: parseFloat(due.balance),
      payment_status: due.balance <= 0 ? 'paid' : due.total_paid > 0 ? 'partial' : 'pending'
    }));

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.student_id,
          fullName: student.full_name,
          level: student.level,
          programme: student.programme,
          academicYear: student.academic_year
        },
        summary: { totalDues, totalDuesAmount, totalPaid, outstandingBalance },
        recentPayments: recentPaymentsResult.rows,
        recentReceipts: recentReceiptsResult.rows,
        dues: duesWithStatus
      }
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const studentsResult = await pool.query(
      'SELECT COUNT(*) as total FROM students WHERE is_active = true'
    );
    const totalStudents = parseInt(studentsResult.rows[0].total);

    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(da.amount), 0) as expected_revenue
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       WHERE d.is_active = true`
    );
    const expectedRevenue = parseFloat(revenueResult.rows[0].expected_revenue);

    const collectedResult = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as collected
       FROM payments p
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.status IN ('approved', 'completed') AND d.is_active = true`
    );
    const amountCollected = parseFloat(collectedResult.rows[0].collected);

    const outstandingResult = await pool.query(
      `SELECT COALESCE(SUM(da.amount - COALESCE(paid.total_paid, 0)), 0) as outstanding
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       LEFT JOIN (
         SELECT student_id, due_id, SUM(amount) as total_paid
         FROM payments
         WHERE status IN ('approved', 'completed')
         GROUP BY student_id, due_id
       ) paid ON paid.student_id = da.student_id AND paid.due_id = da.due_id
       WHERE d.is_active = true`
    );
    const outstandingBalance = parseFloat(outstandingResult.rows[0].outstanding);

    const defaultersResult = await pool.query(
      `SELECT COUNT(DISTINCT da.student_id) as defaulters
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       LEFT JOIN (
         SELECT student_id, due_id, SUM(amount) as total_paid
         FROM payments
         WHERE status IN ('approved', 'completed')
         GROUP BY student_id, due_id
       ) paid ON paid.student_id = da.student_id AND paid.due_id = da.due_id
       WHERE d.is_active = true
       AND (da.amount - COALESCE(paid.total_paid, 0)) > 0`
    );
    const defaultersCount = parseInt(defaultersResult.rows[0].defaulters);

    const pendingPaymentsResult = await pool.query(
      `SELECT COUNT(*) as total FROM payments WHERE status = 'pending'`
    );
    const pendingPayments = parseInt(pendingPaymentsResult.rows[0].total);

    // Monthly collections (last 6 months) — MySQL DATE_FORMAT
    const monthlyCollectionsResult = await pool.query(
      `SELECT 
         DATE_FORMAT(p.created_at, '%Y-%m') as month,
         SUM(p.amount) as total
       FROM payments p
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.status IN ('approved', 'completed') 
         AND d.is_active = true
         AND p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 6`
    );

    const levelWiseResult = await pool.query(
      `SELECT s.level, COUNT(DISTINCT s.id) as students, COALESCE(SUM(p.amount), 0) as total_paid
       FROM students s
       LEFT JOIN payments p ON p.student_id = s.id AND p.status IN ('approved', 'completed')
       LEFT JOIN due_assignments da ON da.student_id = s.id
       LEFT JOIN dues d ON da.due_id = d.id AND d.is_active = true
       WHERE s.is_active = true
       GROUP BY s.level
       ORDER BY s.level`
    );

    const recentPaymentsResult = await pool.query(
      `SELECT p.id, p.amount, p.payment_method, p.status, p.created_at,
              s.student_id, s.full_name as student_name,
              d.name as due_name
       FROM payments p
       INNER JOIN students s ON p.student_id = s.id
       INNER JOIN dues d ON p.due_id = d.id
       ORDER BY p.created_at DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          expectedRevenue,
          amountCollected,
          outstandingBalance,
          defaultersCount,
          pendingPayments
        },
        charts: {
          monthlyCollections: monthlyCollectionsResult.rows.map(row => ({
            month: row.month,
            total: parseFloat(row.total)
          })),
          levelWisePayments: levelWiseResult.rows.map(row => ({
            level: row.level,
            students: parseInt(row.students),
            totalPaid: parseFloat(row.total_paid)
          }))
        },
        recentPayments: recentPaymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
