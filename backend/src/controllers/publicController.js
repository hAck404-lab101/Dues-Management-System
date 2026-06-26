const { pool } = require('../config/database');
const { generateUUID } = require('../utils/uuid');
const { maskName, maskEmail } = require('../utils/nameMasker');
const { sendEmail } = require('../utils/email');
const paystackService = require('../services/paystackService');
const receiptService = require('../services/receiptService');
const sysLog = require('../lib/systemLogger');
const crypto = require('crypto');

// Helper to verify Turnstile token
const verifyTurnstile = async (token, secretKey) => {
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token
      })
    });
    const json = await res.json();
    return !!json.success;
  } catch (error) {
    console.error('Turnstile verification network error:', error);
    return false;
  }
};

const getSettingValue = async (key, fallback = '') => {
  const { rows } = await pool.query('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [key]);
  return rows[0]?.value ?? fallback;
};

const calculateServiceFee = async (paymentAmount) => {
  const amount = Number(paymentAmount);
  const enabled = (await getSettingValue('service_charge_enabled', 'true')) === 'true';
  if (!enabled) {
    return { fee: 0, type: 'disabled', rate: 0 };
  }

  const type = (await getSettingValue('service_charge_type', 'fixed')).toLowerCase();
  const rawValue = parseFloat(await getSettingValue('payment_service_fee', '0')) || 0;

  if (type === 'percentage') {
    return {
      fee: Math.round(((amount * rawValue) / 100) * 100) / 100,
      type: 'percentage',
      rate: rawValue
    };
  }

  return {
    fee: Math.round(rawValue * 100) / 100,
    type: 'fixed',
    rate: rawValue
  };
};

// Helper to generate a secure random 6-digit OTP code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.lookupStudent = async (req, res) => {
  try {
    const { student_id_or_card, turnstile_token } = req.body;
    
    if (!student_id_or_card) {
      return res.status(400).json({ success: false, message: 'Student ID or ID Card Number is required' });
    }

    // Verify Turnstile
    const turnstileEnabled = (await getSettingValue('turnstile_enabled', 'false')) === 'true';
    if (turnstileEnabled) {
      const secretKey = await getSettingValue('turnstile_secret_key', '');
      const valid = await verifyTurnstile(turnstile_token, secretKey);
      if (!valid) {
        await sysLog.warn('public_access', 'turnstile.failed', 'Turnstile captcha validation failed', { student_id_or_card });
        return res.status(400).json({ success: false, message: 'Captcha verification failed. Please try again.' });
      }
    }

    // Lookup student
    const studentRes = await pool.query(
      `SELECT id, student_id, id_card_number, full_name, email, roster_email, level, programme, academic_year, phone_number, roster_phone 
       FROM students 
       WHERE (student_id = ? OR id_card_number = ?) AND is_active = true LIMIT 1`,
      [student_id_or_card, student_id_or_card]
    );

    if (studentRes.rows.length === 0) {
      await sysLog.warn('public_access', 'lookup.not_found', 'Public lookup student not found', { student_id_or_card });
      return res.status(404).json({ success: false, message: 'Student not found in active roster' });
    }

    const student = studentRes.rows[0];
    const email = student.roster_email || student.email || '';
    const phone = student.roster_phone || student.phone_number || '';
    
    const maskedName = maskName(student.full_name);
    const maskedEmail = maskEmail(email);
    const maskedPhone = phone ? phone.slice(0, 3) + '*****' + phone.slice(-2) : '';

    await sysLog.info('public_access', 'lookup.success', 'Public lookup student found (masked details)', { studentId: student.id }, { studentId: student.id });

    res.json({
      success: true,
      student: {
        id: student.id,
        student_id: student.student_id,
        full_name: maskedName,
        level: student.level,
        programme: student.programme,
        academic_year: student.academic_year,
        email: maskedEmail,
        phone_number: maskedPhone
      }
    });

  } catch (error) {
    console.error('Lookup student error:', error);
    res.status(500).json({ success: false, message: 'Server error during lookup' });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { student_id_or_card } = req.body;
    if (!student_id_or_card) {
      return res.status(400).json({ success: false, message: 'Student ID or Card Number is required' });
    }

    // Lookup student
    const studentRes = await pool.query(
      `SELECT id, student_id, full_name, email, roster_email 
       FROM students 
       WHERE (student_id = ? OR id_card_number = ?) AND is_active = true LIMIT 1`,
      [student_id_or_card, student_id_or_card]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentRes.rows[0];
    const email = student.roster_email || student.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'No registered email address found for this student account. Please contact an administrator.' });
    }

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save OTP to database
    const otpId = generateUUID();
    await pool.query(
      `INSERT INTO student_otps (id, student_id, otp_code, recipient, expires_at, is_verified)
       VALUES (?, ?, ?, ?, ?, false)`,
      [otpId, student.id, otpCode, email, expiresAt]
    );

    // Send OTP email
    const appName = await getSettingValue('app_name', 'DuesPay');
    const mailSubject = `Dues Payment Verification Code - ${appName}`;
    
    const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <h2 style="color: #0B3C5D; text-align: center; margin-bottom: 20px;">Verification Code</h2>
        <p>Hello <strong>${student.full_name}</strong>,</p>
        <p>You have requested to pay departmental dues on the ${appName} portal.</p>
        <p>Please use the following 6-digit verification code (OTP) to confirm your identity and unlock checkout:</p>
        <div style="background-color: #F3F4F6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0; color: #111827; border: 1px dashed #D1D5DB;">
          ${otpCode}
        </div>
        <p style="font-size: 12px; color: #6B7280;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9CA3AF; text-align: center;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      </div>
    `;
    const mailText = `Hello ${student.full_name},\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code is valid for 10 minutes.`;

    const emailSent = await sendEmail(email, mailSubject, mailText, mailHtml, 'student_otp');
    if (!emailSent.success) {
      console.error('Failed to send OTP email:', emailSent.error);
      return res.status(500).json({ success: false, message: 'Failed to deliver verification email. Please contact support.' });
    }

    await sysLog.info('public_access', 'otp.sent', 'Verification OTP sent to student email', { studentId: student.id, email: maskEmail(email) });

    res.json({
      success: true,
      message: 'Verification code sent to your registered email address.'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP request' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { student_id_or_card, otp_code } = req.body;
    if (!student_id_or_card || !otp_code) {
      return res.status(400).json({ success: false, message: 'Student ID and Verification Code are required' });
    }

    // Lookup student
    const studentRes = await pool.query(
      `SELECT id, student_id, id_card_number, full_name, email, roster_email, level, programme, academic_year, phone_number, roster_phone 
       FROM students 
       WHERE (student_id = ? OR id_card_number = ?) AND is_active = true LIMIT 1`,
      [student_id_or_card, student_id_or_card]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentRes.rows[0];

    // Check active OTP
    const otpRes = await pool.query(
      `SELECT id FROM student_otps 
       WHERE student_id = ? AND otp_code = ? AND is_verified = false AND expires_at > CURRENT_TIMESTAMP 
       ORDER BY created_at DESC LIMIT 1`,
      [student.id, otp_code.trim()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    const otp = otpRes.rows[0];

    // Mark OTP as verified
    await pool.query('UPDATE student_otps SET is_verified = true WHERE id = ?', [otp.id]);

    // Retrieve due assignments
    const duesRes = await pool.query(
      `SELECT da.id, da.due_id, da.locked_amount, da.status, d.name as due_name, d.deadline, d.late_fee,
              COALESCE((SELECT SUM(amount) FROM payments WHERE due_id = da.due_id AND student_id = da.student_id AND status IN ('approved', 'completed')), 0) as amount_paid
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       WHERE da.student_id = ? AND d.is_active = true AND da.status IN ('unpaid', 'partial')`,
      [student.id]
    );

    const dues = duesRes.rows.map(row => {
      const lockedAmount = parseFloat(row.locked_amount);
      const paid = parseFloat(row.amount_paid);
      const lateFee = parseFloat(row.late_fee || 0);
      const isOverdue = row.deadline ? new Date(row.deadline) < new Date() && paid < lockedAmount : false;
      const totalDue = lockedAmount + (isOverdue ? lateFee : 0);
      const balance = Math.max(totalDue - paid, 0);

      return {
        id: row.id,
        due_id: row.due_id,
        due_name: row.due_name,
        status: row.status,
        locked_amount: lockedAmount,
        amount_paid: paid,
        late_fee: lateFee,
        total_due: totalDue,
        balance: balance,
        is_overdue: isOverdue,
        deadline: row.deadline
      };
    }).filter(d => d.balance > 0);

    await sysLog.info('public_access', 'otp.verified', 'Verification OTP successfully verified', { studentId: student.id });

    res.json({
      success: true,
      message: 'Identity verified successfully',
      student: {
        id: student.id,
        student_id: student.student_id,
        full_name: student.full_name,
        level: student.level,
        programme: student.programme,
        academic_year: student.academic_year,
        email: student.roster_email || student.email || '',
        phone_number: student.roster_phone || student.phone_number || ''
      },
      dues
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

exports.initiatePayment = async (req, res) => {
  try {
    const { student_id, due_id, amount, payer_email, payer_phone } = req.body;

    if (!student_id || !due_id || !amount || !payer_email) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const payAmount = Math.round(Number(amount) * 100) / 100;
    if (payAmount < 10.00) {
      return res.status(400).json({ success: false, message: 'Minimum online payment amount is GHS 10.00' });
    }

    // Verify student and assignment
    const studentRes = await pool.query('SELECT id, full_name FROM students WHERE id = ? AND is_active = true', [student_id]);
    if (studentRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Active student not found' });
    
    const assignmentRes = await pool.query(
      `SELECT da.locked_amount, d.name as due_name 
       FROM due_assignments da
       INNER JOIN dues d ON da.due_id = d.id
       WHERE da.student_id = ? AND da.due_id = ? AND d.is_active = true LIMIT 1`,
      [student_id, due_id]
    );
    if (assignmentRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Due assignment not found' });

    const lockedAmount = parseFloat(assignmentRes.rows[0].locked_amount);
    const paidRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [due_id, student_id]
    );
    const totalPaid = parseFloat(paidRes.rows[0].total_paid);
    const balance = Math.max(lockedAmount - totalPaid, 0);

    if (payAmount > balance) {
      return res.status(400).json({ success: false, message: `Payment exceeds balance of GHS ${balance.toFixed(2)}` });
    }

    const reference = `DP-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const serviceCharge = await calculateServiceFee(payAmount);
    const serviceFee = serviceCharge.fee;
    const totalCharge = Math.round((payAmount + serviceFee) * 100) / 100;

    const metadata = {
      student_id,
      due_id,
      student_name: studentRes.rows[0].full_name,
      service_fee: serviceFee,
      service_charge_type: serviceCharge.type,
      service_charge_rate: serviceCharge.rate,
      payer_phone
    };

    const paystackResult = await paystackService.initializeTransaction(
      payer_email,
      totalCharge,
      reference,
      metadata
    );

    if (!paystackResult.success) {
      await sysLog.error('integration', 'paystack.initialize.failed', 'Failed to initialize Paystack transaction', { error: paystackResult.error });
      return res.status(400).json({ success: false, message: paystackResult.error });
    }

    const paymentId = generateUUID();
    await pool.query(
      `INSERT INTO payments (id, student_id, due_id, amount, service_fee, payment_method, payment_type, status, paystack_reference, payer_email, payer_phone)
       VALUES (?, ?, ?, ?, ?, 'paystack', 'online', 'pending', ?, ?, ?)`,
      [paymentId, student_id, due_id, payAmount, serviceFee, reference, payer_email, payer_phone || null]
    );

    await sysLog.info('payment', 'payment.initiated', `Online payment initiated for reference: ${reference}`, { reference, amount: payAmount, totalCharge }, { paymentId, studentId: student_id });

    res.json({
      success: true,
      paystack: {
        authorization_url: paystackResult.data.authorization_url,
        access_code: paystackResult.data.access_code,
        reference: paystackResult.data.reference
      }
    });

  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ success: false, message: 'Server error during payment initialization' });
  }
};

exports.paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    // 1. Webhook received log
    await sysLog.info('webhook', 'paystack.webhook.received', 'Paystack webhook request received');

    const isValid = await paystackService.verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      await sysLog.critical('webhook', 'paystack.signature.invalid', 'Rejected forged webhook signature', { headers: req.headers, body: req.body }, { ip: req.ip });
      return res.status(400).send('Invalid signature');
    }

    // 2. Signature verified log
    await sysLog.info('webhook', 'paystack.webhook.signature.verified', 'Webhook HMAC signature verified successfully');

    const event = req.body;
    if (event.event === 'charge.success' && event.data.status === 'success') {
      const reference = event.data.reference;
      
      // Look up payment
      const paymentResult = await pool.query('SELECT * FROM payments WHERE paystack_reference = ? LIMIT 1', [reference]);
      if (paymentResult.rows.length === 0) {
        await sysLog.warn('webhook', 'paystack.payment.not_found', `Payment record for reference ${reference} not found in DB`, { reference });
        return res.status(200).send('Payment not found');
      }

      const payment = paymentResult.rows[0];

      if (payment.status !== 'pending') {
        // Idempotency lock - duplicate webhook ignored
        await sysLog.info('webhook', 'webhook.duplicate.ignored', `Ignored duplicate webhook charge.success for ref ${reference}. Current status: ${payment.status}`, { reference });
        return res.status(200).send('Duplicate webhook ignored');
      }

      // Check due assignment locked amount
      const assignmentResult = await pool.query(
        'SELECT locked_amount FROM due_assignments WHERE student_id = ? AND due_id = ? LIMIT 1',
        [payment.student_id, payment.due_id]
      );
      const lockedAmount = assignmentResult.rows.length > 0 ? parseFloat(assignmentResult.rows[0].locked_amount) : payment.amount;

      // Update payment to approved/completed
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      try {
        await connection.query(
          `UPDATE payments 
           SET status = 'approved', paystack_transaction_id = ?, approved_by = NULL, approved_at = CURRENT_TIMESTAMP, approval_source = 'paystack_webhook', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [event.data.id.toString(), payment.id]
        );

        // Calculate total paid including this transaction
        const paidResult = await connection.query(
          `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments 
           WHERE student_id = ? AND due_id = ? AND status IN ('approved', 'completed')`,
          [payment.student_id, payment.due_id]
        );
        const totalPaid = parseFloat(paidResult.rows[0].total_paid);

        // Recalculate due assignment status
        let assignmentStatus = 'unpaid';
        if (totalPaid >= lockedAmount) {
          assignmentStatus = 'paid';
        } else if (totalPaid > 0) {
          assignmentStatus = 'partial';
        }

        await connection.query(
          `UPDATE due_assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ? AND due_id = ?`,
          [assignmentStatus, payment.student_id, payment.due_id]
        );

        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

      // 3. Payment approved log
      await sysLog.info('payment', 'payment.approved', `Auto-approved online payment via Paystack: ref ${reference}`, { reference, amount: payment.amount }, { paymentId: payment.id, studentId: payment.student_id });

      // Generate receipt (triggers notifications)
      const receipt = await receiptService.generateReceipt(payment.id, payment.student_id, payment.due_id, payment.amount);
      
      if (receipt) {
        // 4. Receipt created log
        await sysLog.info('payment', 'receipt.created', `Generated digital receipt: No ${receipt.receipt_number}`, { receiptNumber: receipt.receipt_number }, { paymentId: payment.id, studentId: payment.student_id });
        
        // 5. Email queued log
        await sysLog.info('email', 'email.queued', `Payment confirmation email queued for delivery`, { email: payment.payer_email }, { paymentId: payment.id });

        // 6. SMS queued log
        if (event.data.metadata?.payer_phone) {
          await sysLog.info('sms', 'sms.queued', `Payment confirmation SMS queued for delivery`, { phone: event.data.metadata.payer_phone }, { paymentId: payment.id });
        }
      }
    }
    
    res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook processing error:', error);
    await sysLog.error('webhook', 'paystack.webhook.failed', 'Failed to process webhook event', { error: error.message });
    res.status(500).send('Webhook processing error');
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference is required' });

    const result = await pool.query(
      `SELECT p.id, p.amount, p.status, r.receipt_number, r.receipt_url 
       FROM payments p 
       LEFT JOIN receipts r ON p.id = r.payment_id 
       WHERE p.paystack_reference = ? LIMIT 1`,
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment reference not found' });
    }

    res.json({
      success: true,
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyReceipt = async (req, res) => {
  try {
    const { receipt_number, student_id } = req.body;
    
    if (!receipt_number || !student_id) {
      return res.status(400).json({ success: false, message: 'Receipt number and student index number are required' });
    }

    const { rows: turnRows } = await pool.query('SELECT value FROM settings WHERE `key` = "turnstile_enabled"');
    const turnstileEnabled = turnRows[0]?.value === 'true';
    if (turnstileEnabled) {
      const { turnstile_token } = req.body;
      const secretKey = await getSettingValue('turnstile_secret_key', '');
      const valid = await verifyTurnstile(turnstile_token, secretKey);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Captcha verification failed. Please try again.' });
      }
    }

    const receipt = await receiptService.getReceiptByNumber(receipt_number);
    if (!receipt || receipt.index_number !== student_id) {
      await sysLog.warn('public_access', 'receipt.verification.failed', 'Attempted receipt verification failed', { receipt_number, student_id });
      return res.status(404).json({ success: false, message: 'Receipt not found or details do not match' });
    }

    await sysLog.info('public_access', 'receipt.verification.success', `Receipt ${receipt_number} verified successfully`, { receiptNumber: receipt_number });

    res.json({
      success: true,
      receipt: {
        receipt_number: receipt.receipt_number,
        student_name: receipt.full_name,
        index_number: receipt.index_number,
        level: receipt.level,
        programme: receipt.programme,
        due_name: receipt.due_name,
        amount_paid: receipt.amount_paid,
        balance: receipt.balance,
        total_amount: receipt.total_amount,
        issued_at: receipt.issued_at,
        receipt_url: receipt.receipt_url
      }
    });

  } catch (error) {
    console.error('Verify receipt error:', error);
    res.status(500).json({ success: false, message: 'Server error during receipt verification' });
  }
};
