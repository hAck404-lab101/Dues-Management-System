const { pool } = require('../config/database');
const paystackService = require('../services/paystackService');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const receiptService = require('../services/receiptService');
const crypto = require('crypto');
const { generateUUID } = require('../utils/uuid');

exports.initializePayment = async (req, res) => {
  try {
    const { dueId, amount } = req.body;
    const userId = req.user.id;

    const studentResult = await pool.query(
      'SELECT s.id, s.email, s.full_name FROM students s WHERE s.user_id = ?',
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const student = studentResult.rows[0];

    const assignmentResult = await pool.query(
      `SELECT da.amount as assigned_amount, d.name as due_name
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       WHERE da.due_id = ? AND da.student_id = ? AND d.is_active = true`,
      [dueId, student.id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Due not assigned to this student' });
    }

    const assignment = assignmentResult.rows[0];

    const paymentResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments
       WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [dueId, student.id]
    );

    const totalPaid = parseFloat(paymentResult.rows[0].total_paid);
    const balance = parseFloat(assignment.assigned_amount) - totalPaid;
    const paymentAmount = amount || balance;

    if (paymentAmount > balance) {
      return res.status(400).json({ success: false, message: `Amount exceeds balance. Balance: GHS ${balance}` });
    }
    if (paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const reference = `UCC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Fetch service fee from settings
    const feeResult = await pool.query('SELECT value FROM settings WHERE `key` = "payment_service_fee"');
    const serviceFee = parseFloat(feeResult.rows[0]?.value || '0');
    const totalToCharge = paymentAmount + serviceFee;

    const paystackResult = await paystackService.initializeTransaction(
      student.email,
      totalToCharge,
      reference,
      { student_id: student.id, due_id: dueId, student_name: student.full_name, service_fee: serviceFee }
    );

    if (!paystackResult.success) {
      return res.status(400).json({ success: false, message: paystackResult.error });
    }

    const paymentId = generateUUID();
    await pool.query(
      `INSERT INTO payments (id, student_id, due_id, amount, service_fee, payment_method, payment_type, status, paystack_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, student.id, dueId, paymentAmount, serviceFee, 'paystack', 'online', 'pending', reference]
    );

    const createdPayment = await pool.query(
      'SELECT id, amount, service_fee, status, paystack_reference, created_at FROM payments WHERE id = ?',
      [paymentId]
    );

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      payment: createdPayment.rows[0],
      paystack: {
        authorization_url: paystackResult.data.authorization_url,
        access_code: paystackResult.data.access_code,
        reference: paystackResult.data.reference
      }
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const verifyResult = await paystackService.verifyTransaction(reference);

    if (!verifyResult.success) {
      return res.status(400).json({ success: false, message: verifyResult.error || 'Payment verification failed' });
    }

    const transaction = verifyResult.data;

    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE paystack_reference = ?',
      [reference]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const payment = paymentResult.rows[0];

    if (transaction.status === 'success' && payment.status === 'pending') {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        await connection.query(
          `UPDATE payments SET status = 'completed', paystack_transaction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [transaction.id.toString(), payment.id]
        );

        const studentRows = await connection.wrappedQuery(
          `SELECT s.*, d.name as due_name
           FROM students s
           INNER JOIN dues d ON d.id = ?
           WHERE s.id = ?`,
          [payment.due_id, payment.student_id]
        );

        if (studentRows.rows.length > 0) {
          const receipt = await receiptService.generateReceipt(payment.id, studentRows.rows[0].id, payment.due_id, payment.amount, connection);
          await sendPaymentConfirmationEmail(studentRows.rows[0], payment, receipt.receipt_url).catch(err => console.error('Email error:', err));
        }

        await connection.commit();

        res.json({
          success: true,
          message: 'Payment verified and completed successfully',
          payment: { ...payment, status: 'completed', paystack_transaction_id: transaction.id.toString() }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      res.json({ success: true, message: 'Payment verification completed', payment });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
      const reference = event.data.reference;

      const paymentResult = await pool.query(
        'SELECT * FROM payments WHERE paystack_reference = ?',
        [reference]
      );

      if (paymentResult.rows.length > 0 && paymentResult.rows[0].status === 'pending') {
        const payment = paymentResult.rows[0];
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          await connection.query(
            `UPDATE payments SET status = 'completed', paystack_transaction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [event.data.id.toString(), payment.id]
          );

          const studentRows = await connection.wrappedQuery(
            `SELECT s.*, d.name as due_name FROM students s INNER JOIN dues d ON d.id = ? WHERE s.id = ?`,
            [payment.due_id, payment.student_id]
          );

          if (studentRows.rows.length > 0) {
            const receipt = await receiptService.generateReceipt(payment.id, studentRows.rows[0].id, payment.due_id, payment.amount, connection);
            await sendPaymentConfirmationEmail(studentRows.rows[0], payment, receipt.receipt_url).catch(err => console.error('Email error:', err));
          }

          await connection.commit();
        } catch (error) {
          await connection.rollback();
          console.error('Webhook processing error:', error);
        } finally {
          connection.release();
        }
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

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Proof of payment is required' });
    }

    const studentResult = await pool.query(
      'SELECT s.id FROM students s WHERE s.user_id = ?',
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const student = studentResult.rows[0];

    const assignmentResult = await pool.query(
      `SELECT da.amount as assigned_amount
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       WHERE da.due_id = ? AND da.student_id = ? AND d.is_active = true`,
      [dueId, student.id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Due not assigned to this student' });
    }

    const totalPaidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments
       WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [dueId, student.id]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
    const balance = parseFloat(assignmentResult.rows[0].assigned_amount) - totalPaid;

    if (amount > balance) {
      return res.status(400).json({ success: false, message: `Amount exceeds balance. Balance: GHS ${balance}` });
    }

    const proofUrl = `/uploads/${req.file.filename}`;
    const paymentId = generateUUID();

    await pool.query(
      `INSERT INTO payments (id, student_id, due_id, amount, payment_method, payment_type, status, proof_image_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, student.id, dueId, amount, paymentMethod || 'other', 'manual', 'pending', proofUrl, notes || null]
    );

    const result = await pool.query(
      'SELECT id, amount, status, payment_method, created_at FROM payments WHERE id = ?',
      [paymentId]
    );

    res.status(201).json({
      success: true,
      message: 'Manual payment submitted successfully. Waiting for approval.',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Create manual payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { studentId, dueId, status, page = 1, limit = 20 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let query = `
      SELECT p.id, p.amount, p.payment_method, p.payment_type, p.status, 
             p.paystack_reference, p.proof_image_url, p.notes, p.created_at, p.approved_at,
             s.student_id, s.full_name as student_name, s.email as student_email,
             d.name as due_name,
             u.email as approved_by_email
      FROM payments p
      INNER JOIN students s ON p.student_id = s.id
      INNER JOIN dues d ON p.due_id = d.id
      LEFT JOIN users u ON p.approved_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'student') {
      query += ` AND s.user_id = ?`;
      params.push(userId);
    }
    if (studentId) { query += ` AND p.student_id = ?`; params.push(studentId); }
    if (dueId) { query += ` AND p.due_id = ?`; params.push(dueId); }
    if (status) { query += ` AND p.status = ?`; params.push(status); }

    query += ` ORDER BY p.created_at DESC`;

    if (userRole !== 'student') {
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      ...(userRole !== 'student' && { pagination: { page: parseInt(page), limit: parseInt(limit) } })
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT p.*, s.student_id, s.full_name as student_name, s.email as student_email,
              d.name as due_name, d.amount as due_amount,
              u.email as approved_by_email
       FROM payments p
       INNER JOIN students s ON p.student_id = s.id
       INNER JOIN dues d ON p.due_id = d.id
       LEFT JOIN users u ON p.approved_by = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (userRole === 'student') {
      const studentCheck = await pool.query(
        'SELECT user_id FROM students WHERE id = ?',
        [result.rows[0].student_id]
      );
      if (studentCheck.rows[0].user_id !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const paymentResult = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Payment is already ${payment.status}` });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        `UPDATE payments SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [userId, id]
      );

      const studentRows = await connection.wrappedQuery(
        `SELECT s.*, d.name as due_name FROM students s INNER JOIN dues d ON d.id = ? WHERE s.id = ?`,
        [payment.due_id, payment.student_id]
      );

      if (studentRows.rows.length > 0) {
        const receipt = await receiptService.generateReceipt(payment.id, studentRows.rows[0].id, payment.due_id, payment.amount, connection);
        await sendPaymentConfirmationEmail(studentRows.rows[0], payment, receipt.receipt_url).catch(err => console.error('Email error:', err));
      }

      await connection.commit();
      res.json({ success: true, message: 'Payment approved successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const paymentResult = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Payment is already ${payment.status}` });
    }

    await pool.query(
      `UPDATE payments SET status = 'rejected', approved_by = ?, rejected_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId, reason || 'Payment proof not acceptable', id]
    );

    res.json({ success: true, message: 'Payment rejected successfully' });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resendSMSReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch payment and student info
    const { rows: paymentRows } = await pool.query(
      `SELECT p.amount, p.payment_method, p.payment_type,
              r.receipt_number, r.receipt_url, r.amount_paid,
              s.full_name, s.phone_number, s.student_id as index_number,
              d.name as due_name 
       FROM payments p
       INNER JOIN receipts r ON p.id = r.payment_id
       INNER JOIN students s ON p.student_id = s.id
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.id = ?`,
      [id]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Completed payment or receipt not found' });
    }

    const data = paymentRows[0];

    if (!data.phone_number) {
      return res.status(400).json({ success: false, message: 'Student has no registered phone number' });
    }

    const { sendSMS } = require('../services/notificationService');

    // Fetch SMS template
    const { rows: templateRows } = await pool.query('SELECT `value` FROM settings WHERE `key` = "sms_payment_template"');
    let smsMsg = templateRows[0]?.value || `Hello {name}, your payment of GHS {amount} for {due_name} has been received. Receipt: {receipt_no}. Download: {url}`;

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fullReceiptUrl = `${appUrl}${data.receipt_url}`;

    // Replace placeholders
    smsMsg = smsMsg
      .replace(/{name}/g, data.full_name)
      .replace(/{id_no}/g, data.index_number)
      .replace(/{amount}/g, Number(data.amount_paid || data.amount).toFixed(2))
      .replace(/{due_name}/g, data.due_name)
      .replace(/{receipt_no}/g, data.receipt_number)
      .replace(/{url}/g, fullReceiptUrl);

    const success = await sendSMS(data.phone_number, smsMsg);

    if (success) {
      res.json({ success: true, message: 'SMS resent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send SMS via provider' });
    }
  } catch (error) {
    console.error('Resend SMS error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resendEmailReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch payment and student info
    const { rows: paymentRows } = await pool.query(
      `SELECT p.amount, p.payment_method, p.payment_type, p.created_at,
              r.receipt_number, r.receipt_url, r.amount_paid,
              s.full_name, s.email, s.phone_number, s.student_id as index_number,
              d.name as due_name 
       FROM payments p
       INNER JOIN receipts r ON p.id = r.payment_id
       INNER JOIN students s ON p.student_id = s.id
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.id = ?`,
      [id]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Completed payment or receipt not found' });
    }

    const data = paymentRows[0];

    if (!data.email) {
      return res.status(400).json({ success: false, message: 'Student has no registered email' });
    }

    const appUrl = process.env.BASE_URL || 'http://localhost:3000';
    const fullReceiptUrl = `${appUrl}${data.receipt_url}`;

    const student = {
      full_name: data.full_name,
      email: data.email
    };

    const payment = {
      amount: data.amount,
      payment_method: data.payment_method,
      created_at: data.created_at
    };

    const result = await sendPaymentConfirmationEmail(student, payment, fullReceiptUrl);

    if (result.success) {
      res.json({ success: true, message: 'Email resent successfully' });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to send email' });
    }
  } catch (error) {
    console.error('Resend Email error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
