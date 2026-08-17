const { pool } = require('../config/database');
const { sendDueNotificationEmail } = require('../utils/email');
const { generateUUID } = require('../utils/uuid');

const queueDueEmail = (student, due) => {
  const run = () => sendDueNotificationEmail(student, due).catch(err => console.error('Due email error:', err));
  if (typeof setImmediate === 'function') setImmediate(run);
  else setTimeout(run, 0);
};

const getAssignableDue = async (id) => {
  const dueResult = await pool.query('SELECT id, name, amount, deadline, description, is_active FROM dues WHERE id = ?', [id]);
  if (dueResult.rows.length === 0) return { error: { status: 404, message: 'Due not found' } };
  const due = dueResult.rows[0];
  if (!due.is_active) return { error: { status: 400, message: 'This due is inactive. Activate it before assigning it to students.' } };
  return { due };
};

exports.getAllDues = async (req, res) => {
  try {
    const { academicYear, isActive } = req.query;
    let query = `
      SELECT d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description,
             d.is_active, d.created_at, d.updated_at,
             u.email as created_by_email
      FROM dues d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (academicYear) { query += ` AND d.academic_year = ?`; params.push(academicYear); }
    if (isActive !== undefined) { query += ` AND d.is_active = ?`; params.push(isActive === 'true' ? 1 : 0); }
    
    query += ` ORDER BY d.created_at DESC`;
    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get dues error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDueById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.id, d.name, d.amount, d.academic_year, d.deadline, d.late_fee, d.description,
              d.is_active, d.created_at, d.updated_at,
              u.email as created_by_email
       FROM dues d LEFT JOIN users u ON d.created_by = u.id WHERE d.id = ?`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Due not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDueStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;
    
    // Select da.locked_amount as assigned_amount
    let query = `
      SELECT s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year,
             da.locked_amount as assigned_amount,
             COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as total_paid,
             da.locked_amount - COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) as balance
      FROM due_assignments da
      INNER JOIN students s ON da.student_id = s.id
      LEFT JOIN payments p ON p.due_id = da.due_id AND p.student_id = s.id
      WHERE da.due_id = ?
      GROUP BY s.id, s.student_id, s.full_name, s.email, s.level, s.programme, s.academic_year, da.locked_amount
    `;
    const params = [id];
    if (status) {
      query += ` HAVING `;
      if (status === 'paid') query += `COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) >= da.locked_amount`;
      else if (status === 'partial') query += `COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) > 0 AND COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) < da.locked_amount`;
      else if (status === 'pending') query += `COALESCE(SUM(CASE WHEN p.status IN ('approved', 'completed') THEN p.amount ELSE 0 END), 0) = 0`;
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
    const { name, title, amount, academicYear, academic_year, deadline, description, lateFee, late_fee } = req.body;
    const dueName = title || name;
    const dueYear = academic_year || academicYear;
    const dueLateFee = late_fee !== undefined ? late_fee : lateFee;
    const userId = req.user.id;
    if (!dueName || !amount || !dueYear) {
      return res.status(400).json({ success: false, message: 'Name/Title, amount, and academic year are required' });
    }
    const newId = generateUUID();
    const historyId = generateUUID();
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query(
        `INSERT INTO dues (id, name, amount, academic_year, deadline, description, late_fee, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, dueName, amount, dueYear, deadline || null, description || null, dueLateFee || 0, true, userId]
      );
      await conn.query(
        `INSERT INTO due_price_history (id, due_id, amount, changed_by, reason) VALUES (?, ?, ?, ?, ?)`,
        [historyId, newId, amount, userId, 'Initial price setting on creation']
      );
      await conn.commit();
      
      const result = await pool.query('SELECT id, name, amount, academic_year, deadline, late_fee, description, is_active, created_at FROM dues WHERE id = ?', [newId]);
      res.status(201).json({ success: true, message: 'Due created successfully', data: result.rows[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Create due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateDue = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, amount, academicYear, academic_year, deadline, description, lateFee, late_fee, price_change_reason } = req.body;
    
    const dueName = title !== undefined ? title : name;
    const dueYear = academic_year !== undefined ? academic_year : academicYear;
    const dueLateFee = late_fee !== undefined ? late_fee : lateFee;

    const dueRes = await pool.query('SELECT name, amount FROM dues WHERE id = ?', [id]);
    if (dueRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Due not found' });
    
    const currentAmount = parseFloat(dueRes.rows[0].amount);
    const newAmount = amount !== undefined ? parseFloat(amount) : currentAmount;
    const amountChanged = amount !== undefined && newAmount !== currentAmount;
    
    if (amountChanged && !price_change_reason) {
      return res.status(400).json({
        success: false,
        message: 'Price change reason (price_change_reason) is required when changing amount'
      });
    }

    const updateFields = [];
    const params = [];
    if (dueName !== undefined) { updateFields.push('name = ?'); params.push(dueName); }
    if (amount !== undefined) { updateFields.push('amount = ?'); params.push(newAmount); }
    if (dueYear !== undefined) { updateFields.push('academic_year = ?'); params.push(dueYear); }
    if (deadline !== undefined) { updateFields.push('deadline = ?'); params.push(deadline || null); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
    if (dueLateFee !== undefined) { updateFields.push('late_fee = ?'); params.push(dueLateFee); }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query(`UPDATE dues SET ${updateFields.join(', ')} WHERE id = ?`, params);
      
      if (amountChanged) {
        const historyId = generateUUID();
        await conn.query(
          `INSERT INTO due_price_history (id, due_id, amount, changed_by, reason) VALUES (?, ?, ?, ?, ?)`,
          [historyId, id, newAmount, req.user.id, price_change_reason]
        );
      }
      
      await conn.commit();
      
      const result = await pool.query('SELECT id, name, amount, academic_year, deadline, late_fee, description, is_active FROM dues WHERE id = ?', [id]);
      res.json({ success: true, message: 'Due updated successfully', data: result.rows[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Update due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPriceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT h.id, h.amount, h.effective_from, h.reason, u.email as changed_by_email
       FROM due_price_history h
       INNER JOIN users u ON h.changed_by = u.id
       WHERE h.due_id = ?
       ORDER BY h.effective_from DESC`,
      [id]
    );

    const data = rows.map((row, index) => {
      const nextRow = rows[index + 1];
      return {
        id: row.id,
        date: row.effective_from,
        new_amount: parseFloat(row.amount),
        old_amount: nextRow ? parseFloat(nextRow.amount) : null,
        changed_by: row.changed_by_email,
        reason: row.reason
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get due price history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.repriceUnpaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmation_text } = req.body;
    
    const dueRes = await pool.query('SELECT name, amount FROM dues WHERE id = ?', [id]);
    if (dueRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Due not found' });
    }
    const due = dueRes.rows[0];
    
    if (confirmation_text !== due.name) {
      return res.status(400).json({
        success: false,
        message: `Confirmation text must match the due's name exactly: "${due.name}"`
      });
    }
    
    const historyRes = await pool.query(
      'SELECT id FROM due_price_history WHERE due_id = ? ORDER BY effective_from DESC LIMIT 1',
      [id]
    );
    const historyId = historyRes.rows[0]?.id || null;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const [updateResult] = await conn.query(
        `UPDATE due_assignments da
         SET da.amount = ?, da.locked_amount = ?, da.price_history_id = ?
         WHERE da.due_id = ? AND da.status = 'unpaid' AND (
           SELECT COALESCE(SUM(p.amount), 0) FROM payments p 
           WHERE p.due_id = da.due_id AND p.student_id = da.student_id AND p.status IN ('approved', 'completed')
         ) = 0`,
        [due.amount, due.amount, historyId, id]
      );
      
      await conn.commit();
      
      const sysLog = require('../lib/systemLogger');
      if (sysLog) {
        await sysLog.info(
          'payment',
          'dues.reprice_unpaid',
          `Re-priced unpaid assignments for due: ${due.name} to GHS ${due.amount}`,
          { dueId: id, newAmount: due.amount, affectedRows: updateResult.affectedRows },
          { userId: req.user.id }
        );
      }
      
      res.json({
        success: true,
        message: `Successfully re-priced ${updateResult.affectedRows} unpaid assignments to GHS ${due.amount}`
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Reprice unpaid error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.assignDue = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const filters = body.filters || {};
    const dryRun = body.dry_run === true;
    const studentId = body.studentId || body.student_id;
    const level = filters.level || body.level;
    const programme = filters.program || filters.programme || body.program || body.programme;
    const academicYear = filters.year || filters.academic_year || body.academicYear || body.academic_year;

    const { due, error } = await getAssignableDue(id);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const requestedAmount = body.amount === undefined || body.amount === ''
      ? Number(due.amount)
      : Number(body.amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Assignment amount must be greater than zero' });
    }

    let query = 'SELECT id, full_name, email, level, programme, academic_year FROM students WHERE is_active = true';
    const params = [];

    if (studentId) {
      query += ' AND id = ?';
      params.push(studentId);
    } else {
      if (level) { query += ' AND level = ?'; params.push(level); }
      if (programme) { query += ' AND programme = ?'; params.push(programme); }
      if (academicYear) { query += ' AND academic_year = ?'; params.push(academicYear); }
    }

    const studentsResult = await pool.query(query, params);
    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: studentId ? 'Selected student was not found or is inactive' : 'No students found matching criteria'
      });
    }

    const sample = students.slice(0, 10).map((student) => ({
      id: student.id,
      full_name: student.full_name,
      email: student.email,
      level: student.level,
      programme: student.programme
    }));

    if (dryRun) {
      return res.json({ success: true, dry_run: true, count: students.length, sample });
    }

    const historyRes = await pool.query(
      'SELECT id FROM due_price_history WHERE due_id = ? ORDER BY effective_from DESC LIMIT 1',
      [id]
    );
    const historyId = historyRes.rows[0]?.id || null;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      for (const student of students) {
        await conn.query(
          `INSERT INTO due_assignments
             (id, due_id, locked_amount, price_history_id, student_id, level, programme, amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')
           ON DUPLICATE KEY UPDATE
             locked_amount = VALUES(locked_amount),
             price_history_id = VALUES(price_history_id),
             amount = VALUES(amount)`,
          [
            generateUUID(),
            id,
            requestedAmount,
            historyId,
            student.id,
            student.level,
            student.programme,
            requestedAmount
          ]
        );
      }
      await conn.commit();
    } catch (assignmentError) {
      await conn.rollback();
      throw assignmentError;
    } finally {
      conn.release();
    }

    try {
      const sysLog = require('../lib/systemLogger');
      if (sysLog) {
        await sysLog.info(
          'job',
          studentId ? 'dues.assigned_student' : 'dues.assigned_bulk',
          studentId
            ? `Assigned due ${due.name} to ${students[0].full_name}`
            : `Assigned due ${due.name} to ${students.length} students`,
          { dueId: id, studentId: studentId || null, count: students.length, amount: requestedAmount },
          { userId: req.user.id }
        );
      }
    } catch (logError) {
      console.error('Due assignment audit log warning:', logError);
    }

    students.forEach((student) => queueDueEmail(student, { ...due, amount: requestedAmount }));

    return res.json({
      success: true,
      message: studentId
        ? `Due assigned to ${students[0].full_name}`
        : `Due assigned to ${students.length} students`,
      dry_run: false,
      count: students.length,
      sample
    });
  } catch (error) {
    console.error('Assign due error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.activateDue = async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();
    const [updateResult] = await conn.query('UPDATE dues SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    conn.release();
    if (updateResult.affectedRows === 0) return res.status(404).json({ success: false, message: 'Due not found' });
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
    const [updateResult] = await conn.query('UPDATE dues SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    conn.release();
    if (updateResult.affectedRows === 0) return res.status(404).json({ success: false, message: 'Due not found' });
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
    // Perform soft delete by setting is_active = false
    await pool.query('UPDATE dues SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ success: true, message: 'Due archived successfully' });
  } catch (error) {
    console.error('Delete due error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
