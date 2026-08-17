const { pool } = require('../config/database');
const paystackService = require('../services/paystackService');
const receiptService = require('../services/receiptService');

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const pendingStatuses = new Set(['pending', 'ongoing', 'processing', 'queued']);

const expectedPaystackAmount = (payment) =>
  Math.round((roundMoney(payment.amount) + roundMoney(payment.service_fee)) * 100);

const validateTransaction = (payment, transaction) => {
  if (!transaction) return 'Paystack returned no transaction data';
  if (String(transaction.reference || '') !== String(payment.paystack_reference || '')) {
    return 'Payment reference mismatch';
  }
  if (String(transaction.currency || '').toUpperCase() !== 'GHS') {
    return `Unexpected payment currency: ${transaction.currency || 'unknown'}`;
  }

  const expected = expectedPaystackAmount(payment);
  const actual = Number(transaction.amount);
  if (!Number.isFinite(actual) || actual !== expected) {
    return `Payment amount mismatch. Expected ${expected} pesewas but Paystack reported ${actual}`;
  }

  return null;
};

const refreshAssignmentStatus = async (connection, payment) => {
  const [assignmentRows] = await connection.query(
    'SELECT amount FROM due_assignments WHERE due_id = ? AND student_id = ? LIMIT 1',
    [payment.due_id, payment.student_id]
  );
  if (!assignmentRows.length) return;

  const [paidRows] = await connection.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid
     FROM payments
     WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
    [payment.due_id, payment.student_id]
  );

  const assigned = Number(assignmentRows[0].amount || 0);
  const totalPaid = Number(paidRows[0].total_paid || 0);
  const status = totalPaid >= assigned && assigned > 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

  await connection.query(
    'UPDATE due_assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE due_id = ? AND student_id = ?',
    [status, payment.due_id, payment.student_id]
  );
};

const completePayment = async (payment, transaction) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [currentRows] = await connection.query(
      'SELECT * FROM payments WHERE id = ? FOR UPDATE',
      [payment.id]
    );
    if (!currentRows.length) throw new Error('Local payment record not found');
    const current = currentRows[0];

    if (!['completed', 'approved'].includes(current.status)) {
      await connection.query(
        `UPDATE payments
         SET status = 'completed',
             paystack_transaction_id = ?,
             approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [String(transaction.id || ''), current.id]
      );
      await refreshAssignmentStatus(connection, { ...current, status: 'completed' });
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const existingReceipt = await pool.query(
    'SELECT id, receipt_number, receipt_url FROM receipts WHERE payment_id = ? LIMIT 1',
    [payment.id]
  );
  if (existingReceipt.rows.length) return existingReceipt.rows[0];

  try {
    return await receiptService.generateReceipt(
      payment.id,
      payment.student_id,
      payment.due_id,
      payment.amount
    );
  } catch (error) {
    // The money/payment state is authoritative. Receipt generation must not roll
    // a verified payment back to pending/failed.
    console.error('Verified Paystack payment but receipt generation failed:', error);
    return null;
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const reference = req.body?.reference || req.query?.reference || req.query?.trxref;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required' });
    }

    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE paystack_reference = ? LIMIT 1',
      [reference]
    );
    if (!paymentResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const payment = paymentResult.rows[0];
    if (['completed', 'approved'].includes(payment.status)) {
      const receiptResult = await pool.query(
        'SELECT id, receipt_number, receipt_url FROM receipts WHERE payment_id = ? LIMIT 1',
        [payment.id]
      );
      return res.json({
        success: true,
        confirmed: true,
        message: 'Payment has already been confirmed',
        payment,
        receipt: receiptResult.rows[0] || null
      });
    }

    const verifyResult = await paystackService.verifyTransaction(reference);
    if (!verifyResult.success) {
      return res.status(502).json({
        success: false,
        pending: true,
        message: verifyResult.error || 'Paystack verification is temporarily unavailable'
      });
    }

    const transaction = verifyResult.data;
    const validationError = validateTransaction(payment, transaction);
    if (validationError) {
      console.error('Paystack reconciliation rejected:', validationError, {
        reference,
        transactionId: transaction?.id
      });
      return res.status(409).json({ success: false, message: validationError });
    }

    if (transaction.status === 'success') {
      const receipt = await completePayment(payment, transaction);
      return res.json({
        success: true,
        confirmed: true,
        message: 'Payment verified successfully',
        payment: { ...payment, status: 'completed', paystack_transaction_id: String(transaction.id || '') },
        receipt
      });
    }

    if (pendingStatuses.has(String(transaction.status || '').toLowerCase())) {
      return res.status(202).json({
        success: false,
        pending: true,
        paystack_status: transaction.status,
        message: 'Your payment is still being confirmed by Paystack. Please keep this page open.'
      });
    }

    return res.status(400).json({
      success: false,
      pending: false,
      paystack_status: transaction.status,
      message: `Paystack has not confirmed this payment (${transaction.status || 'unknown status'}).`
    });
  } catch (error) {
    console.error('Paystack reconciliation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to reconcile payment right now' });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const valid = await paystackService.verifyWebhookSignature(req.body, signature);
    if (!valid) return res.status(400).send('Invalid signature');

    const event = req.body;
    if (event?.event !== 'charge.success' || event?.data?.status !== 'success') {
      return res.status(200).send('OK');
    }

    const reference = event.data.reference;
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE paystack_reference = ? LIMIT 1',
      [reference]
    );
    if (!paymentResult.rows.length) {
      console.warn('Paystack webhook reference has no local payment record:', reference);
      return res.status(200).send('OK');
    }

    const payment = paymentResult.rows[0];
    const validationError = validateTransaction(payment, event.data);
    if (validationError) {
      console.error('Rejected Paystack webhook:', validationError, { reference });
      return res.status(400).send('Transaction validation failed');
    }

    if (!['completed', 'approved'].includes(payment.status)) {
      await completePayment(payment, event.data);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Paystack webhook reconciliation error:', error);
    return res.status(500).send('Webhook processing error');
  }
};
