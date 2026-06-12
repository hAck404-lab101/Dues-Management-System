const { pool } = require('../config/database');
const paystackService = require('../services/paystackService');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const receiptService = require('../services/receiptService');
const crypto = require('crypto');
const { generateUUID } = require('../utils/uuid');
const { buildReceiptVerifyUrl, enforcePublicUrlInText } = require('../utils/publicUrl');

const adminRoles = ['admin', 'financial_secretary', 'treasurer', 'president'];

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getSettingValue = async (key, fallback = '') => {
  const { rows } = await pool.query('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [key]);
  return rows[0]?.value ?? fallback;
};

const calculateServiceFee = async (paymentAmount) => {
  const amount = roundMoney(paymentAmount);
  const enabled = (await getSettingValue('service_charge_enabled', 'true')) === 'true';
  if (!enabled) {
    return { fee: 0, type: 'disabled', rate: 0 };
  }

  const type = (await getSettingValue('service_charge_type', 'fixed')).toLowerCase();
  const rawValue = parseFloat(await getSettingValue('payment_service_fee', '0')) || 0;

  if (type === 'percentage') {
    return {
      fee: roundMoney((amount * rawValue) / 100),
      type: 'percentage',
      rate: rawValue
    };
  }

  return {
    fee: roundMoney(rawValue),
    type: 'fixed',
    rate: rawValue
  };
};

const completePaymentAndNotify = async ({ payment, transactionId = null, approvedBy = null, status = 'completed' }) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    await connection.query(
      `UPDATE payments
       SET status = ?, paystack_transaction_id = COALESCE(?, paystack_transaction_id), approved_by = COALESCE(?, approved_by), approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, transactionId, approvedBy, payment.id]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
  connection.release();

  try {
    const existing = await pool.query('SELECT id, receipt_number, receipt_url FROM receipts WHERE payment_id = ? LIMIT 1', [payment.id]);
    if (existing.rows.length > 0) return existing.rows[0];
    return await receiptService.generateReceipt(payment.id, payment.student_id, payment.due_id, payment.amount);
  } catch (notifyError) {
    console.error('Receipt/SMS generation after payment confirmation failed:', notifyError);
    return null;
  }
};

exports.initializePayment = async (req, res) => {
  try {
    const { dueId, amount } = req.body;
    const userId = req.user.id;
    const studentResult = await pool.query('SELECT s.id, s.email, s.full_name FROM students s WHERE s.user_id = ?', [userId]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const student = studentResult.rows[0];
    const assignmentResult = await pool.query(
      `SELECT da.amount as assigned_amount, d.name as due_name
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       WHERE da.due_id = ? AND da.student_id = ? AND d.is_active = true`,
      [dueId, student.id]
    );
    if (assignmentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Due not assigned to this student' });

    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [dueId, student.id]
    );
    const balance = roundMoney(parseFloat(assignmentResult.rows[0].assigned_amount) - parseFloat(paidResult.rows[0].total_paid));
    const paymentAmount = roundMoney(parseFloat(amount || balance));
    if (!paymentAmount || paymentAmount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    if (paymentAmount > balance) return res.status(400).json({ success: false, message: `Amount exceeds balance. Balance: GHS ${balance}` });

    const reference = `DMS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const serviceCharge = await calculateServiceFee(paymentAmount);
    const serviceFee = serviceCharge.fee;
    const totalCharge = roundMoney(paymentAmount + serviceFee);

    const paystackResult = await paystackService.initializeTransaction(
      student.email,
      totalCharge,
      reference,
      {
        student_id: student.id,
        due_id: dueId,
        student_name: student.full_name,
        service_fee: serviceFee,
        service_charge_type: serviceCharge.type,
        service_charge_rate: serviceCharge.rate
      }
    );
    if (!paystackResult.success) return res.status(400).json({ success: false, message: paystackResult.error });

    const paymentId = generateUUID();
    await pool.query(
      `INSERT INTO payments (id, student_id, due_id, amount, service_fee, payment_method, payment_type, status, paystack_reference)
       VALUES (?, ?, ?, ?, ?, 'paystack', 'online', 'pending', ?)`,
      [paymentId, student.id, dueId, paymentAmount, serviceFee, reference]
    );
    const createdPayment = await pool.query('SELECT id, amount, service_fee, status, paystack_reference, created_at FROM payments WHERE id = ?', [paymentId]);
    res.json({
      success: true,
      message: 'Payment initialized successfully',
      payment: createdPayment.rows[0],
      charge_summary: {
        amount: paymentAmount,
        service_fee: serviceFee,
        total: totalCharge,
        service_charge_type: serviceCharge.type,
        service_charge_rate: serviceCharge.rate
      },
      paystack: {
        authorization_url: paystackResult.data.authorization_url,
        access_code: paystackResult.data.access_code,
        reference: paystackResult.data.reference
      }
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference is required' });
    const verifyResult = await paystackService.verifyTransaction(reference);
    if (!verifyResult.success) return res.status(400).json({ success: false, message: verifyResult.error || 'Payment verification failed' });
    const transaction = verifyResult.data;
    const paymentResult = await pool.query('SELECT * FROM payments WHERE paystack_reference = ?', [reference]);
    if (paymentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Payment record not found' });
    const payment = paymentResult.rows[0];
    if (transaction.status === 'success' && payment.status === 'pending') {
      const receipt = await completePaymentAndNotify({ payment, transactionId: transaction.id.toString(), status: 'completed' });
      return res.json({ success: true, message: receipt ? 'Payment verified, receipt generated, and SMS queued/sent' : 'Payment verified. Receipt/SMS can be resent manually.', payment: { ...payment, status: 'completed' }, receipt });
    }
    res.json({ success: true, message: 'Payment verification completed', payment });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!signature) return res.status(400).send('Missing signature');
    const isValid = paystackService.verifyWebhookSignature(req.body, signature);
    if (!isValid) return res.status(400).send('Invalid signature');
    const event = req.body;
    if (event.event === 'charge.success' && event.data.status === 'success') {
      const paymentResult = await pool.query('SELECT * FROM payments WHERE paystack_reference = ?', [event.data.reference]);
      if (paymentResult.rows.length > 0 && paymentResult.rows[0].status === 'pending') {
        await completePaymentAndNotify({ payment: paymentResult.rows[0], transactionId: event.data.id.toString(), status: 'completed' });
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing error');
  }
};

exports.createManualPayment = async (req, res) => {
  try {
    const { dueId, amount, paymentMethod, notes } = req.body;
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'Proof of payment is required' });
    const studentResult = await pool.query('SELECT s.id FROM students s WHERE s.user_id = ?', [userId]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student profile not found' });
    const student = studentResult.rows[0];
    const assignmentResult = await pool.query(
      `SELECT da.amount as assigned_amount FROM due_assignments da INNER JOIN dues d ON da.due_id = d.id WHERE da.due_id = ? AND da.student_id = ? AND d.is_active = true`,
      [dueId, student.id]
    );
    if (assignmentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Due not assigned to this student' });
    const totalPaidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [dueId, student.id]
    );
    const balance = roundMoney(parseFloat(assignmentResult.rows[0].assigned_amount) - parseFloat(totalPaidResult.rows[0].total_paid));
    const paymentAmount = roundMoney(parseFloat(amount));
    if (!paymentAmount || paymentAmount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    if (paymentAmount > balance) return res.status(400).json({ success: false, message: `Amount exceeds balance. Balance: GHS ${balance}` });
    const paymentId = generateUUID();
    await pool.query(
      `INSERT INTO payments (id, student_id, due_id, amount, payment_method, payment_type, status, proof_image_url, notes)
       VALUES (?, ?, ?, ?, ?, 'manual', 'pending', ?, ?)`,
      [paymentId, student.id, dueId, paymentAmount, paymentMethod || 'other', `/uploads/${req.file.filename}`, notes || null]
    );
    const result = await pool.query('SELECT id, amount, status, payment_method, created_at FROM payments WHERE id = ?', [paymentId]);
    res.status(201).json({ success: true, message: 'Manual payment submitted successfully. Waiting for approval.', payment: result.rows[0] });
  } catch (error) {
    console.error('Create manual payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { studentId, dueId, status, search, paymentMethod, paymentType, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    let sql = `
      SELECT p.id, p.amount, p.service_fee, p.payment_method, p.payment_type, p.status,
             p.paystack_reference, p.proof_image_url, p.notes, p.created_at, p.approved_at,
             s.student_id, s.full_name as student_name, s.email as student_email, s.phone_number as student_phone,
             d.name as due_name,
             u.email as approved_by_email,
             r.receipt_number, r.receipt_url
      FROM payments p
      INNER JOIN students s ON p.student_id = s.id
      INNER JOIN dues d ON p.due_id = d.id
      LEFT JOIN users u ON p.approved_by = u.id
      LEFT JOIN receipts r ON p.id = r.payment_id
      WHERE 1=1`;
    const params = [];

    if (userRole === 'student') { sql += ' AND s.user_id = ?'; params.push(userId); }
    if (studentId) { sql += ' AND p.student_id = ?'; params.push(studentId); }
    if (dueId) { sql += ' AND p.due_id = ?'; params.push(dueId); }
    if (status && status !== 'all') { sql += ' AND p.status = ?'; params.push(status); }
    if (paymentMethod && paymentMethod !== 'all') { sql += ' AND p.payment_method = ?'; params.push(paymentMethod); }
    if (paymentType && paymentType !== 'all') { sql += ' AND p.payment_type = ?'; params.push(paymentType); }
    if (dateFrom) { sql += ' AND DATE(p.created_at) >= ?'; params.push(dateFrom); }
    if (dateTo) { sql += ' AND DATE(p.created_at) <= ?'; params.push(dateTo); }
    if (search) {
      sql += ` AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR d.name LIKE ? OR p.paystack_reference LIKE ? OR r.receipt_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    const countSql = `SELECT COUNT(*) as total FROM (${sql}) filtered_payments`;
    const countResult = await pool.query(countSql, params);
    sql += ' ORDER BY p.created_at DESC';
    if (userRole !== 'student') {
      const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const safePage = Math.max(parseInt(page) || 1, 1);
      sql += ' LIMIT ? OFFSET ?';
      params.push(safeLimit, (safePage - 1) * safeLimit);
      const result = await pool.query(sql, params);
      const total = Number(countResult.rows[0]?.total || 0);
      return res.json({ success: true, data: result.rows, pagination: { page: safePage, limit: safeLimit, total, pages: Math.max(Math.ceil(total / safeLimit), 1) } });
    }

    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, s.student_id, s.full_name as student_name, s.email as student_email, d.name as due_name, d.amount as due_amount, u.email as approved_by_email
       FROM payments p INNER JOIN students s ON p.student_id = s.id INNER JOIN dues d ON p.due_id = d.id LEFT JOIN users u ON p.approved_by = u.id WHERE p.id = ?`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (req.user.role === 'student') {
      const studentCheck = await pool.query('SELECT user_id FROM students WHERE id = ?', [result.rows[0].student_id]);
      if (studentCheck.rows[0].user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.approvePayment = async (req, res) => {
  try {
    const paymentResult = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (paymentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    const payment = paymentResult.rows[0];
    if (payment.status !== 'pending') return res.status(400).json({ success: false, message: `Payment is already ${payment.status}` });
    const receipt = await completePaymentAndNotify({ payment, approvedBy: req.user.id, status: 'approved' });
    res.json({ success: true, message: receipt ? 'Payment approved, receipt generated, and SMS queued/sent' : 'Payment approved. Receipt/SMS can be resent manually.', receipt });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentResult = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (paymentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    const payment = paymentResult.rows[0];
    if (payment.status !== 'pending') return res.status(400).json({ success: false, message: `Payment is already ${payment.status}` });
    await pool.query(`UPDATE payments SET status = 'rejected', approved_by = ?, rejected_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.user.id, req.body.reason || 'Payment proof not acceptable', id]);
    res.json({ success: true, message: 'Payment rejected successfully' });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const fetchReceiptMessageData = async (paymentId) => {
  const { rows } = await pool.query(
    `SELECT p.amount, p.payment_method, p.payment_type, p.created_at,
            r.receipt_number, r.receipt_url, r.amount_paid,
            s.full_name, s.email, s.phone_number, s.student_id as index_number, s.user_id as student_user_id,
            d.name as due_name
     FROM payments p
     INNER JOIN receipts r ON p.id = r.payment_id
     INNER JOIN students s ON p.student_id = s.id
     INNER JOIN dues d ON p.due_id = d.id
     WHERE p.id = ?`,
    [paymentId]
  );
  return rows[0] || null;
};

exports.resendSMSReceipt = async (req, res) => {
  try {
    const data = await fetchReceiptMessageData(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Approved/completed payment receipt not found. Generate receipt first by approving or verifying payment.' });
    if (!adminRoles.includes(req.user.role) && !(req.user.role === 'student' && req.user.id === data.student_user_id)) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!data.phone_number) return res.status(400).json({ success: false, message: 'Student has no registered phone number' });
    const { sendSMS } = require('../services/notificationService');
    const { rows: templateRows } = await pool.query('SELECT `value` FROM settings WHERE `key` = "sms_payment_template"');
    let smsMsg = templateRows[0]?.value || 'Hello {name}, your payment of GHS {amount} for {due_name} has been received. Receipt: {receipt_no}. Verify: {url}';
    const verifyUrl = enforcePublicUrlInText(buildReceiptVerifyUrl(data.receipt_number));
    smsMsg = smsMsg
      .replace(/{name}/g, data.full_name)
      .replace(/{id_no}/g, data.index_number)
      .replace(/{amount}/g, Number(data.amount_paid || data.amount).toFixed(2))
      .replace(/{due_name}/g, data.due_name)
      .replace(/{receipt_no}/g, data.receipt_number)
      .replace(/{url}/g, verifyUrl);
    smsMsg = enforcePublicUrlInText(smsMsg);
    const success = await sendSMS(data.phone_number, smsMsg, { type: 'payment_receipt_resend', relatedType: 'payment', relatedId: req.params.id });
    if (success) return res.json({ success: true, message: `SMS receipt sent to ${data.full_name}` });
    res.status(502).json({ success: false, message: 'SMS could not be sent. Check SMS settings/provider logs.' });
  } catch (error) {
    console.error('Resend SMS error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.resendEmailReceipt = async (req, res) => {
  try {
    const data = await fetchReceiptMessageData(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Approved/completed payment receipt not found' });
    if (!adminRoles.includes(req.user.role) && !(req.user.role === 'student' && req.user.id === data.student_user_id)) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!data.email) return res.status(400).json({ success: false, message: 'Student has no registered email' });
    const verifyUrl = enforcePublicUrlInText(buildReceiptVerifyUrl(data.receipt_number));
    const result = await sendPaymentConfirmationEmail(
      { full_name: data.full_name, email: data.email },
      { amount: data.amount, payment_method: data.payment_method, created_at: data.created_at, due_name: data.due_name },
      verifyUrl,
      { receipt_number: data.receipt_number, amount_paid: data.amount_paid || data.amount }
    );
    if (result.success) return res.json({ success: true, message: 'Email resent successfully' });
    res.status(500).json({ success: false, message: result.error || 'Failed to send email' });
  } catch (error) {
    console.error('Resend Email error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
