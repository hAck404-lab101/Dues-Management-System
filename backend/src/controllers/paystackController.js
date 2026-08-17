const { pool } = require('../config/database');
const paystackService = require('../services/paystackService');
const receiptService = require('../services/receiptService');

const PENDING_PAYSTACK_STATUSES = new Set(['pending', 'ongoing', 'processing', 'queued']);

const expectedChargeInMinorUnits = (payment) => {
  const amount = Number(payment.amount || 0);
  const fee = Number(payment.service_fee || 0);
  return Math.round((amount + fee) * 100);
};

const validateSuccessfulTransaction = (payment, transaction) => {
  if (!transaction || transaction.status !== 'success') {
    return { ok: false, message: 'Paystack has not marked this transaction as successful yet.' };
  }

  if (String(transaction.reference || '') !== String(payment.paystack_reference || '')) {
    return { ok: false, message: 'Payment reference does not match the Paystack transaction.' };
  }

  if (String(transaction.currency || '').toUpperCase() !== 'GHS') {
    return { ok: false, message: 'Unexpected payment currency returned by Paystack.' };
  }

  const expectedAmount = expectedChargeInMinorUnits(payment);
  const actualAmount = Number(transaction.amount || 0);
  if (actualAmount !== expectedAmount) {
    console.error('Paystack amount mismatch', {
      reference: payment.paystack_reference,
      expectedAmount,
      actualAmount
    });
    return { ok: false, message: 'Paystack payment amount does not match the expected charge.' };
  }

  return { ok: true };
};

const updateAssignmentStatus = async (payment) => {
  try {
    const assignmentResult = await pool.query(
      'SELECT amount FROM due_assignments WHERE due_id = ? AND student_id = ? LIMIT 1',
      [payment.due_id, payment.student_id]
    );
    if (assignmentResult.rows.length === 0) return;

    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid
       FROM payments
       WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [payment.due_id, payment.student_id]
    );

    const assigned = Number(assignmentResult.rows[0].amount || 0);
    const totalPaid = Number(paidResult.rows[0]?.total_paid || 0);
    const status = totalPaid >= assigned && assigned > 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

    await pool.query(
      'UPDATE due_assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE due_id = ? AND student_id = ?',
      [status, payment.due_id, payment.student_id]
    );
  } catch (error) {
    console.error('Failed to update due assignment after Paystack confirmation:', error.message);
  }
};

const finalizePayment = async (payment, transaction) => {
  const transactionId = transaction?.id != null ? String(transaction.id) : null;

  const result = await pool.query(
    `UPDATE payments
     SET status = 'completed',
         paystack_transaction_id = COALESCE(?, paystack_transaction_id),
         approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`,
    [transactionId, payment.id]
  );

  await updateAssignmentStatus(payment);

  const existingReceipt = await pool.query(
    'SELECT id, receipt_number, receipt_url FROM receipts WHERE payment_id = ? LIMIT 1',
    [payment.id]
  );
  if (existingReceipt.rows.length > 0) return existingReceipt.rows[0];

  const affectedRows = Number(result.rows?.[0]?.affectedRows || 0);
  if (affectedRows === 0) return null;

  try {
    return await receiptService.generateReceipt(
      payment.id,
      payment.student_id,
      payment.due_id,
      payment.amount
    );
  } catch (error) {
    console.error('Receipt generation after Paystack confirmation failed:', error.message);
    return null;
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const reference = String(req.body?.reference || req.query?.reference || req.query?.trxref || '').trim();
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required.' });
    }

    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE paystack_reference = ? LIMIT 1',
      [reference]
    );
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No local payment record exists for this reference.' });
    }

    const payment = paymentResult.rows[0];

    if (payment.status === 'completed' || payment.status === 'approved') {
      const receiptResult = await pool.query(
        'SELECT id, receipt_number, receipt_url FROM receipts WHERE payment_id = ? LIMIT 1',
        [payment.id]
      );
      return res.json({
        success: true,
        confirmed: true,
        message: 'Payment has already been confirmed.',
        payment,
        receipt: receiptResult.rows[0] || null
      });
    }

    const verifyResult = await paystackService.verifyTransaction(reference);
    if (!verifyResult.success) {
      return res.status(502).json({
        success: false,
        pending: true,
        message: verifyResult.error || 'Paystack verification is temporarily unavailable. We will retry.'
      });
    }

    const transaction = verifyResult.data;
    const paystackStatus = String(transaction?.status || '').toLowerCase();

    if (PENDING_PAYSTACK_STATUSES.has(paystackStatus)) {
      return res.status(202).json({
        success: false,
        pending: true,
        paystack_status: paystackStatus,
        message: 'Your payment was received and is still being confirmed by Paystack. Please keep this page open.'
      });
    }

    if (paystackStatus !== 'success') {
      return res.status(409).json({
        success: false,
        pending: false,
        paystack_status: paystackStatus || 'unknown',
        message: `Paystack has not confirmed this payment (${paystackStatus || 'unknown status'}).`
      });
    }

    const validation = validateSuccessfulTransaction(payment, transaction);
    if (!validation.ok) {
      return res.status(409).json({ success: false, pending: false, message: validation.message });
    }

    const receipt = await finalizePayment(payment, transaction);
    const refreshed = await pool.query('SELECT * FROM payments WHERE id = ? LIMIT 1', [payment.id]);

    return res.json({
      success: true,
      confirmed: true,
      message: receipt
        ? 'Payment verified successfully and receipt generated.'
        : 'Payment verified successfully. Receipt generation is being completed.',
      payment: refreshed.rows[0] || { ...payment, status: 'completed' },
      receipt
    });
  } catch (error) {
    console.error('Paystack verification error:', error);
    return res.status(500).json({ success: false, pending: true, message: 'Unable to verify the Paystack payment right now. We will retry.' });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!signature) return res.status(400).send('Missing signature');

    const isValid = await paystackService.verifyWebhookSignature(req.body, signature);
    if (!isValid) return res.status(400).send('Invalid signature');

    if (req.body?.event !== 'charge.success') return res.status(200).send('OK');

    const transaction = req.body.data;
    const reference = String(transaction?.reference || '').trim();
    if (!reference) return res.status(200).send('OK');

    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE paystack_reference = ? LIMIT 1',
      [reference]
    );

    if (paymentResult.rows.length === 0) {
      console.error('Paystack webhook reference not found locally:', reference);
      return res.status(503).send('Payment record not ready');
    }

    const payment = paymentResult.rows[0];
    const validation = validateSuccessfulTransaction(payment, transaction);
    if (!validation.ok) {
      console.error('Rejected Paystack webhook:', reference, validation.message);
      return res.status(400).send('Transaction validation failed');
    }

    if (payment.status === 'pending') {
      await finalizePayment(payment, transaction);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return res.status(500).send('Webhook processing error');
  }
};
