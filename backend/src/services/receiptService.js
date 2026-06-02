const PDFDocument = require('pdfkit');
const qr = require('qr-image');
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { generateUUID } = require('../utils/uuid');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const { buildReceiptVerifyUrl } = require('../utils/publicUrl');

const normalizePrefix = (value = '') => {
  const clean = String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  return clean || 'DMS';
};

const getSettings = async (executor) => {
  const { rows } = await executor('SELECT `key`, `value` FROM settings');
  const settings = {};
  rows.forEach((row) => { settings[row.key] = row.value; });
  const appName = settings.app_name || settings.email_from_name || 'Dues Management System';
  const prefix = normalizePrefix(settings.receipt_prefix || appName.split(/\s+/).map(w => w[0]).join(''));
  return {
    appName,
    appDescription: settings.app_description || 'Secure student dues, payments, and receipts portal',
    primaryColor: settings.primary_color || '#0B3C5D',
    secondaryColor: settings.secondary_color || '#F2A900',
    receiptPrefix: prefix
  };
};

const generateReceiptNumber = async (executor = pool.query.bind(pool), prefix = 'DMS') => {
  const year = new Date().getFullYear();
  const safePrefix = normalizePrefix(prefix);
  const result = await executor('SELECT COUNT(*) as total FROM receipts WHERE receipt_number LIKE ?', [`${safePrefix}-${year}-%`]);
  const count = parseInt(result.rows[0].total || 0, 10) + 1;
  return `${safePrefix}-${year}-${String(count).padStart(6, '0')}`;
};

exports.generateReceipt = async (paymentId, studentId, dueId, amountPaid, db = null) => {
  try {
    const executor = db && db.wrappedQuery ? db.wrappedQuery.bind(db) : (db ? db.query.bind(db) : pool.query.bind(pool));
    const brand = await getSettings(executor);

    const paymentResult = await executor(
      `SELECT p.*, s.student_id, s.full_name, s.email, s.phone_number, s.level, s.programme, s.academic_year,
              d.name as due_name, d.amount as total_due_amount
       FROM payments p
       INNER JOIN students s ON p.student_id = s.id
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.id = ? AND s.id = ?`,
      [paymentId, studentId]
    );

    if (paymentResult.rows.length === 0) throw new Error('Payment or student not found');
    const data = paymentResult.rows[0];

    const totalPaidResult = await executor(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments
       WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [dueId, studentId]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid || 0);
    const totalDueAmount = parseFloat(data.total_due_amount || 0);
    const balance = totalDueAmount - totalPaid;
    const receiptNumber = await generateReceiptNumber(executor, brand.receiptPrefix);
    const verifyUrl = buildReceiptVerifyUrl(receiptNumber);

    const qrData = JSON.stringify({
      receipt_number: receiptNumber,
      student_id: data.student_id,
      due_name: data.due_name,
      amount: amountPaid,
      verify_url: verifyUrl,
      date: new Date().toISOString()
    });

    const qrCode = qr.image(qrData, { type: 'png', size: 5 });
    const qrBuffer = [];
    await new Promise((resolve, reject) => {
      qrCode.on('data', chunk => qrBuffer.push(chunk));
      qrCode.on('end', resolve);
      qrCode.on('error', reject);
    });

    const receiptDir = path.join(__dirname, '../../receipts');
    if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });

    const filename = `receipt-${receiptNumber}.pdf`;
    const filepath = path.join(receiptDir, filename);
    const receiptUrl = `/receipts/${filename}`;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.roundedRect(36, 36, 523, 94, 16).fill(brand.primaryColor);
    doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text(brand.appName.toUpperCase(), 56, 58, { width: 483, align: 'center' });
    doc.fillColor('#E5E7EB').fontSize(10).font('Helvetica').text(brand.appDescription, 56, 88, { width: 483, align: 'center' });
    doc.fillColor(brand.secondaryColor).fontSize(12).font('Helvetica-Bold').text('OFFICIAL PAYMENT RECEIPT', 56, 110, { width: 483, align: 'center' });

    doc.moveDown(6);
    doc.fillColor('#111827').fontSize(16).font('Helvetica-Bold').text('Payment Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6B7280')
      .text(`Receipt No: ${receiptNumber}`, 50, 165)
      .text(`Date: ${new Date().toLocaleDateString('en-GH')}`, 350, 165, { align: 'right' });

    const section = (title, y) => {
      doc.roundedRect(50, y, 495, 28, 8).fill('#F3F4F6');
      doc.fillColor(brand.primaryColor).fontSize(11).font('Helvetica-Bold').text(title, 65, y + 9);
    };
    const label = (text, x, y) => doc.fillColor('#6B7280').fontSize(9).font('Helvetica-Bold').text(text, x, y);
    const value = (text, x, y, opts = {}) => doc.fillColor('#111827').fontSize(11).font('Helvetica').text(text, x, y, opts);

    section('Student Details', 195);
    label('Name', 65, 238); value(data.full_name, 65, 252, { width: 210 });
    label('Index Number', 315, 238); value(data.student_id, 315, 252, { width: 210 });
    label('Level', 65, 290); value(String(data.level || ''), 65, 304, { width: 210 });
    label('Programme', 315, 290); value(data.programme || '', 315, 304, { width: 210 });
    label('Academic Year', 65, 342); value(data.academic_year || '', 65, 356, { width: 210 });

    section('Payment Details', 395);
    label('Due Name', 65, 438); value(data.due_name, 65, 452, { width: 210 });
    label('Payment Method', 315, 438); value(String(data.payment_method || '').replace(/_/g, ' ').toUpperCase(), 315, 452, { width: 210 });
    label('Payment Type', 65, 490); value(data.payment_type === 'online' ? 'Online Payment' : 'Manual Payment', 65, 504, { width: 210 });

    section('Amount Summary', 545);
    label('Total Due Amount', 65, 588); value(`GHS ${Number(totalDueAmount).toFixed(2)}`, 65, 602, { width: 160 });
    label('Amount Paid', 245, 588); doc.fillColor(brand.primaryColor).fontSize(13).font('Helvetica-Bold').text(`GHS ${Number(amountPaid).toFixed(2)}`, 245, 600, { width: 130 });
    label('Balance', 400, 588); doc.fillColor(balance <= 0 ? '#166534' : '#B45309').fontSize(13).font('Helvetica-Bold').text(`GHS ${Number(balance).toFixed(2)}`, 400, 600, { width: 120 });

    if (qrBuffer.length > 0) doc.image(Buffer.concat(qrBuffer), 247, 650, { fit: [100, 100] });
    doc.fillColor('#6B7280').fontSize(8).font('Helvetica').text('Scan QR code to verify receipt', 50, 756, { align: 'center' });
    doc.fillColor('#6B7280').fontSize(8).font('Helvetica').text(`Verify online: ${verifyUrl}`, 50, 768, { align: 'center' });
    doc.fillColor('#6B7280').fontSize(8).font('Helvetica').text('This is a computer-generated receipt. No signature required.', 50, 782, { align: 'center' });
    doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica').text(`${brand.appName} • Digital Receipt System`, 50, 795, { align: 'center' });

    doc.end();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const receiptId = generateUUID();
    await executor(
      `INSERT INTO receipts (id, receipt_number, student_id, due_id, payment_id, amount_paid, balance, total_amount, receipt_url, qr_code_data, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptId, receiptNumber, studentId, dueId, paymentId, amountPaid, balance, totalDueAmount, receiptUrl, qrData, null]
    );

    try {
      const { sendSMS } = require('./notificationService');
      const emailEnabledResult = await executor('SELECT `value` FROM settings WHERE `key` = "receipt_email_delivery_enabled"');
      const smsEnabledResult = await executor('SELECT `value` FROM settings WHERE `key` = "receipt_sms_delivery_enabled"');
      const emailEnabled = emailEnabledResult.rows[0]?.value !== 'false';
      const smsEnabled = smsEnabledResult.rows[0]?.value !== 'false';

      const templateResult = await executor('SELECT `value` FROM settings WHERE `key` = "sms_payment_template"');
      let smsMsg = templateResult.rows[0]?.value || `Hello {name}, your payment of GHS {amount} for {due_name} has been confirmed. Receipt: {receipt_no}. Verify: {url}`;
      smsMsg = smsMsg
        .replace(/{name}/g, data.full_name)
        .replace(/{id_no}/g, data.student_id)
        .replace(/{amount}/g, Number(amountPaid).toFixed(2))
        .replace(/{due_name}/g, data.due_name)
        .replace(/{receipt_no}/g, receiptNumber)
        .replace(/{url}/g, verifyUrl);

      if (emailEnabled && data.email) {
        await sendPaymentConfirmationEmail(
          { full_name: data.full_name, email: data.email },
          { amount: amountPaid, payment_method: data.payment_method, created_at: data.created_at, due_name: data.due_name },
          verifyUrl,
          { receipt_number: receiptNumber, amount_paid: amountPaid },
          [{ filename: `Receipt-${receiptNumber}.pdf`, path: filepath }]
        );
      }
      if (smsEnabled && data.phone_number) await sendSMS(data.phone_number, smsMsg, { type: 'payment_receipt', relatedType: 'payment', relatedId: paymentId });
    } catch (notifyErr) {
      console.error('Notification error after receipt generation:', notifyErr);
    }

    const result = await executor('SELECT id, receipt_number, receipt_url FROM receipts WHERE id = ?', [receiptId]);
    return result.rows[0];
  } catch (error) {
    console.error('Generate receipt error:', error);
    throw error;
  }
};

exports.getReceiptByNumber = async (receiptNumber) => {
  const result = await pool.query(
    `SELECT r.*, s.student_id, s.full_name, s.email, s.level, s.programme, d.name as due_name
     FROM receipts r
     INNER JOIN students s ON r.student_id = s.id
     INNER JOIN dues d ON r.due_id = d.id
     WHERE r.receipt_number = ?`,
    [receiptNumber]
  );
  return result.rows[0] || null;
};
