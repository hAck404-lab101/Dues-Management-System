const PDFDocument = require('pdfkit');
const qr = require('qr-image');
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { generateUUID } = require('../utils/uuid');

const generateReceiptNumber = async (executor = pool.query.bind(pool)) => {
  const year = new Date().getFullYear();
  const result = await executor(
    `SELECT COUNT(*) as total FROM receipts WHERE receipt_number LIKE ?`,
    [`UCC-${year}-%`]
  );
  const count = parseInt(result.rows[0].total) + 1;
  return `UCC-${year}-${String(count).padStart(6, '0')}`;
};

exports.generateReceipt = async (paymentId, studentId, dueId, amountPaid, db = null) => {
  try {
    // Determine which query method to use (either the passed connection's wrappedQuery or the global pool query)
    const executor = db && db.wrappedQuery ? db.wrappedQuery.bind(db) : (db ? db.query.bind(db) : pool.query.bind(pool));

    const paymentResult = await executor(
      `SELECT p.*, s.student_id, s.full_name, s.email, s.phone_number, s.level, s.programme, s.academic_year,
              d.name as due_name, d.amount as total_due_amount
       FROM payments p
       INNER JOIN students s ON p.student_id = s.id
       INNER JOIN dues d ON p.due_id = d.id
       WHERE p.id = ? AND s.id = ?`,
      [paymentId, studentId]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error('Payment or student not found');
    }

    const data = paymentResult.rows[0];

    const totalPaidResult = await executor(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments
       WHERE due_id = ? AND student_id = ? AND status IN ('approved', 'completed')`,
      [dueId, studentId]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
    const totalDueAmount = parseFloat(data.total_due_amount);
    const balance = totalDueAmount - totalPaid;

    const receiptNumber = await generateReceiptNumber(executor);

    const qrData = JSON.stringify({
      receipt_number: receiptNumber,
      student_id: data.student_id,
      due_name: data.due_name,
      amount: amountPaid,
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
    if (!fs.existsSync(receiptDir)) {
      fs.mkdirSync(receiptDir, { recursive: true });
    }

    const filename = `receipt-${receiptNumber}.pdf`;
    const filepath = path.join(receiptDir, filename);
    const receiptUrl = `/receipts/${filename}`;

    // Fetch appearance settings
    const { rows: settingsRows } = await executor('SELECT `key`, `value` FROM settings WHERE category = "appearance"');
    const settings = {};
    settingsRows.forEach(s => settings[s.key] = s.value);
    const appName = settings.app_name || 'UCC DEPARTMENTAL DUES';

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fillColor('#0B3C5D').fontSize(24).font('Helvetica-Bold').text(appName.toUpperCase(), { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#666').fontSize(12).font('Helvetica').text('University of Cape Coast', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor('#000').fontSize(16).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#666')
      .text(`Receipt No: ${receiptNumber}`, { align: 'left' })
      .text(`Date: ${new Date().toLocaleDateString('en-GH')}`, { align: 'right' });
    doc.moveDown(1.5);

    doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text('Student Details:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#333').fontSize(11)
      .text(`Name: ${data.full_name}`)
      .text(`Student ID: ${data.student_id}`)
      .text(`Level: ${data.level}`)
      .text(`Programme: ${data.programme}`)
      .text(`Academic Year: ${data.academic_year}`);
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('Payment Details:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11)
      .text(`Due Name: ${data.due_name}`)
      .text(`Payment Method: ${data.payment_method.replace('_', ' ').toUpperCase()}`)
      .text(`Payment Type: ${data.payment_type === 'online' ? 'Online Payment' : 'Manual Payment'}`);
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('Amount Details:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11)
      .text(`Total Due Amount: GHS ${Number(totalDueAmount).toFixed(2)}`)
      .text(`Amount Paid: GHS ${Number(amountPaid).toFixed(2)}`)
      .fillColor('#F2A900').font('Helvetica-Bold')
      .text(`Balance: GHS ${Number(balance).toFixed(2)}`, { align: 'right' });
    doc.moveDown(2);

    if (qrBuffer.length > 0) {
      const qrImageBuffer = Buffer.concat(qrBuffer);
      doc.image(qrImageBuffer, { fit: [100, 100], align: 'center' });
    }

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#666').font('Helvetica').text('Scan QR code to verify receipt', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666')
      .text('This is a computer-generated receipt. No signature required.', { align: 'center' })
      .text('UCC Departmental Dues Management System', { align: 'center' });

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

    // Send notifications
    try {
      const { sendEmail, sendSMS } = require('./notificationService');

      // Fetch SMS template
      const templateResult = await executor('SELECT `value` FROM settings WHERE `key` = "sms_payment_template"');
      let smsMsg = templateResult.rows[0]?.value || `Hello {name}, your payment of GHS {amount} for {due_name} has been received. Receipt: {receipt_no}. Download: {url}`;

      const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const fullReceiptUrl = `${appUrl}${receiptUrl}`;

      // Replace placeholders for SMS
      smsMsg = smsMsg
        .replace(/{name}/g, data.full_name)
        .replace(/{id_no}/g, data.student_id)
        .replace(/{amount}/g, Number(amountPaid).toFixed(2))
        .replace(/{due_name}/g, data.due_name)
        .replace(/{receipt_no}/g, receiptNumber)
        .replace(/{url}/g, fullReceiptUrl);

      // Create professional HTML Email Template
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #0B3C5D; padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px; color: #F2A900;">${appName.toUpperCase()}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 14px;">University of Cape Coast</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; hieght: 60px; background-color: #e8f5e9; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <span style="color: #2e7d32; font-size: 30px;">✓</span>
              </div>
              <h2 style="margin: 0; color: #2c3e50; font-size: 22px;">Payment Successful!</h2>
              <p style="color: #7f8c8d; margin-top: 8px;">Your payment for <strong>${data.due_name}</strong> has been received.</p>
            </div>

            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Receipt Number</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-size: 14px; font-weight: bold; text-align: right;">${receiptNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Student Name</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-size: 14px; font-weight: bold; text-align: right;">${data.full_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Index Number</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-size: 14px; font-weight: bold; text-align: right;">${data.student_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Amount Paid</td>
                  <td style="padding: 15px 0 8px 0; color: #0B3C5D; font-size: 20px; font-weight: 800; text-align: right; border-top: 1px dashed #ced4da;">GHS ${Number(amountPaid).toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center;">
              <p style="color: #7f8c8d; font-size: 13px; line-height: 1.6;">
                A PDF copy of your receipt has been attached to this email for your records. 
                You can also view your payment history and download receipts at any time by logging into the student portal.
              </p>
              <a href="${appUrl}" style="display: inline-block; background-color: #F2A900; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Visit Student Portal</a>
            </div>
          </div>

          <div style="background-color: #f1f2f6; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #95a5a6; font-size: 12px;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            <p style="margin: 5px 0 0 0; color: #95a5a6; font-size: 11px;">This is a computer-generated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `;

      const emailText = `Hello ${data.full_name}, your payment of GHS ${Number(amountPaid).toFixed(2)} for ${data.due_name} has been received. Receipt: ${receiptNumber}. Your PDF receipt is attached to this email.`;

      if (data.email) {
        await sendEmail(
          data.email,
          `Payment Receipt: ${receiptNumber} - ${data.due_name}`,
          emailText,
          emailHtml,
          [
            {
              filename: `Receipt-${receiptNumber}.pdf`,
              path: filepath // Absolute path to the generated PDF
            }
          ]
        );
      }

      if (data.phone_number) {
        await sendSMS(data.phone_number, smsMsg);
      }
    } catch (notifyErr) {
      console.error('Notification error after receipt generation:', notifyErr);
    }

    const result = await executor(
      'SELECT id, receipt_number, receipt_url FROM receipts WHERE id = ?',
      [receiptId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Generate receipt error:', error);
    throw error;
  }
};

exports.getReceiptByNumber = async (receiptNumber) => {
  const result = await pool.query(
    `SELECT r.*, s.student_id, s.full_name, s.email, s.level, s.programme,
            d.name as due_name
     FROM receipts r
     INNER JOIN students s ON r.student_id = s.id
     INNER JOIN dues d ON r.due_id = d.id
     WHERE r.receipt_number = ?`,
    [receiptNumber]
  );
  return result.rows[0] || null;
};
