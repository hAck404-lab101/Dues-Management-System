const nodemailer = require('nodemailer');
const { pool } = require('../config/database');
const { generateUUID } = require('./uuid');
const { decrypt } = require('./encryption');

let transporter = null;

const getTransporter = async () => {
  // Fetch settings from DB
  const { rows } = await pool.query('SELECT `key`, `value` FROM settings WHERE category = "comm_email"');
  const settings = {};
  rows.forEach(r => settings[r.key] = r.key === 'email_pass' ? decrypt(r.value) : r.value);

  return nodemailer.createTransport({
    host: settings.email_host || process.env.EMAIL_HOST,
    port: parseInt(settings.email_port || process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: settings.email_user || process.env.EMAIL_USER,
      pass: settings.email_pass || process.env.EMAIL_PASS
    }
  });
};

const sendEmail = async (to, subject, html, type = 'general') => {
  let emailId;
  try {
    emailId = generateUUID();
    // Store email in database first
    await pool.query(
      `INSERT INTO email_notifications (id, recipient_email, subject, body, type, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [emailId, to, subject, html, type]
    );

    // Get fresh transporter with current settings
    const currentTransporter = await getTransporter();

    // Fetch sender info
    const { rows: senderRows } = await pool.query('SELECT `key`, `value` FROM settings WHERE `key` IN ("email_from", "email_from_name")');
    const senderSettings = {};
    senderRows.forEach(r => senderSettings[r.key] = r.value);

    const fromName = senderSettings.email_from_name || 'UCC Dues Management';
    const fromEmail = senderSettings.email_from || process.env.EMAIL_USER;

    // Send email
    const info = await currentTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html
    });

    // Update status to sent
    await pool.query(
      'UPDATE email_notifications SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['sent', emailId]
    );

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);

    // Update status to failed
    try {
      if (emailId) {
        await pool.query(
          'UPDATE email_notifications SET status = ? WHERE id = ?',
          ['failed', emailId]
        );
      }
    } catch (updateError) {
      console.error('Failed to update email status:', updateError);
    }

    return { success: false, error: error.message };
  }
};

const sendPaymentConfirmationEmail = async (student, payment, receiptUrl) => {
  const subject = 'Payment Confirmation - UCC Departmental Dues';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0B3C5D; color: white; padding: 20px; text-align: center;">
        <h1>UCC Departmental Dues Management</h1>
      </div>
      <div style="padding: 20px; background-color: #F5F7FA;">
        <h2 style="color: #0B3C5D;">Payment Confirmed</h2>
        <p>Dear ${student.full_name},</p>
        <p>Your payment has been confirmed successfully.</p>
        <div style="background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #F2A900;">
          <p><strong>Amount Paid:</strong> GHS ${payment.amount}</p>
          <p><strong>Payment Method:</strong> ${payment.payment_method.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}</p>
        </div>
        <p>You can download your receipt from the dashboard or click <a href="${receiptUrl}" style="color: #0B3C5D;">here</a>.</p>
        <p>Thank you for your payment.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">This is an automated message from UCC Departmental Dues Management System.</p>
      </div>
    </div>
  `;

  return sendEmail(student.email, subject, html, 'payment_confirmation');
};

const sendDueNotificationEmail = async (student, due) => {
  const subject = 'New Departmental Due - UCC';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0B3C5D; color: white; padding: 20px; text-align: center;">
        <h1>UCC Departmental Dues Management</h1>
      </div>
      <div style="padding: 20px; background-color: #F5F7FA;">
        <h2 style="color: #0B3C5D;">New Due Assigned</h2>
        <p>Dear ${student.full_name},</p>
        <p>A new departmental due has been assigned to you.</p>
        <div style="background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #F2A900;">
          <p><strong>Due Name:</strong> ${due.name}</p>
          <p><strong>Amount:</strong> GHS ${due.amount}</p>
          <p><strong>Deadline:</strong> ${due.deadline ? new Date(due.deadline).toLocaleDateString() : 'No deadline'}</p>
          ${due.description ? `<p><strong>Description:</strong> ${due.description}</p>` : ''}
        </div>
        <p>Please log in to your dashboard to make payment.</p>
        <a href="${process.env.BASE_URL}/student/dashboard" style="display: inline-block; background-color: #F2A900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Go to Dashboard</a>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">This is an automated message from UCC Departmental Dues Management System.</p>
      </div>
    </div>
  `;

  return sendEmail(student.email, subject, html, 'due_notification');
};

const sendReminderEmail = async (student, due, outstanding) => {
  const subject = 'Outstanding Due Reminder - UCC';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0B3C5D; color: white; padding: 20px; text-align: center;">
        <h1>UCC Departmental Dues Management</h1>
      </div>
      <div style="padding: 20px; background-color: #F5F7FA;">
        <h2 style="color: #0B3C5D;">Outstanding Due Reminder</h2>
        <p>Dear ${student.full_name},</p>
        <p>This is a reminder that you have an outstanding departmental due.</p>
        <div style="background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #F2A900;">
          <p><strong>Due Name:</strong> ${due.name}</p>
          <p><strong>Total Amount:</strong> GHS ${due.amount}</p>
          <p><strong>Outstanding Balance:</strong> GHS ${outstanding}</p>
          <p><strong>Deadline:</strong> ${due.deadline ? new Date(due.deadline).toLocaleDateString() : 'No deadline'}</p>
        </div>
        <p>Please log in to your dashboard to make payment.</p>
        <a href="${process.env.BASE_URL}/student/dashboard" style="display: inline-block; background-color: #F2A900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Go to Dashboard</a>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">This is an automated message from UCC Departmental Dues Management System.</p>
      </div>
    </div>
  `;

  return sendEmail(student.email, subject, html, 'reminder');
};

module.exports = {
  sendEmail,
  sendPaymentConfirmationEmail,
  sendDueNotificationEmail,
  sendReminderEmail
};
