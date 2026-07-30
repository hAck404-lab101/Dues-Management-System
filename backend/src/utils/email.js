const nodemailer = require('nodemailer');
const { pool } = require('../config/database');
const { generateUUID } = require('./uuid');
const { decrypt } = require('./encryption');
const { buildPaymentReceiptEmail, buildSignupEmail, buildClearanceEmail, buildExportEmail, getBranding } = require('./emailTemplates');

const getSettingMap = async () => {
  const { rows } = await pool.query('SELECT `key`, `value` FROM settings WHERE category IN ("comm_email", "email", "sys_general", "appearance")');
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = row.key === 'email_pass' ? decrypt(row.value) : row.value;
  });
  return settings;
};

const getTransporter = async () => {
  const settings = await getSettingMap();
  const port = parseInt(settings.email_port || process.env.EMAIL_PORT || '465', 10);
  const secure = String(settings.email_secure || '').toLowerCase() === 'true' || port === 465;

  return nodemailer.createTransport({
    host: settings.email_host || process.env.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: settings.email_user || process.env.EMAIL_USER,
      pass: settings.email_pass || process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const logEmail = async ({ to, subject, html, text, type, status, error }) => {
  const id = generateUUID();
  try {
    await pool.query(
      `INSERT INTO email_notifications (id, recipient_email, subject, body, type, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, to, subject, html || text || '', type || 'general', status, error || null]
    );
  } catch (_) {
    try {
      await pool.query(
        `INSERT INTO email_notifications (id, recipient_email, subject, body, type, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, to, subject, html || text || '', type || 'general', status]
      );
    } catch (logError) {
      console.warn('Email log failed:', logError.message);
    }
  }
  return id;
};

const sendEmail = async (to, subject, textOrHtml, htmlOrType, maybeTypeOrAttachments, maybeAttachments) => {
  let text = '';
  let html = '';
  let type = 'general';
  let attachments = [];

  if (Array.isArray(maybeTypeOrAttachments)) {
    html = htmlOrType || textOrHtml;
    text = textOrHtml || '';
    attachments = maybeTypeOrAttachments;
  } else if (Array.isArray(maybeAttachments)) {
    text = textOrHtml || '';
    html = htmlOrType || '';
    type = maybeTypeOrAttachments || 'general';
    attachments = maybeAttachments;
  } else if (typeof maybeTypeOrAttachments === 'string') {
    text = textOrHtml || '';
    html = htmlOrType || '';
    type = maybeTypeOrAttachments;
  } else {
    html = textOrHtml || '';
    text = String(textOrHtml || '').replace(/<[^>]+>/g, ' ');
    type = htmlOrType || 'general';
  }

  try {
    if (!to || !subject) return { success: false, error: 'Missing email recipient or subject' };
    const settings = await getSettingMap();
    const brand = await getBranding();
    const currentTransporter = await getTransporter();
    const fromName = settings.email_from_name || brand.appName || process.env.EMAIL_FROM_NAME || 'Dues Management System';
    const fromEmail = settings.email_from || settings.email_user || process.env.EMAIL_FROM || process.env.EMAIL_USER;

    if (!fromEmail) return { success: false, error: 'SMTP email sender is not configured' };

    const info = await currentTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html: html || text,
      attachments
    });

    await logEmail({ to, subject, html: html || text, text, type, status: 'sent' });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    await logEmail({ to, subject, html: html || text, text, type, status: 'failed', error: error.message });
    return { success: false, error: error.message };
  }
};

const sendSignupEmail = async (student) => {
  if (!student?.email) return { success: false, error: 'Student email missing' };
  const tpl = await buildSignupEmail({ student });
  return sendEmail(student.email, tpl.subject, tpl.text, tpl.html, 'signup');
};

const sendPaymentConfirmationEmail = async (student, payment, receiptUrl, receipt = null, attachments = []) => {
  if (!student?.email) return { success: false, error: 'Student email missing' };
  const tpl = await buildPaymentReceiptEmail({ student, payment, receipt, receiptUrl });
  return sendEmail(student.email, tpl.subject, tpl.text, tpl.html, 'payment_receipt', attachments);
};

const sendClearanceEmail = async (student, clearanceStatus, attachments = []) => {
  if (!student?.email) return { success: false, error: 'Student email missing' };
  const tpl = await buildClearanceEmail({ student, clearanceStatus, attachmentNote: attachments.length ? 'Your clearance PDF is attached to this email.' : '' });
  return sendEmail(student.email, tpl.subject, tpl.text, tpl.html, 'clearance', attachments);
};

const sendExportEmail = async (to, recipientName, exportName, attachments = []) => {
  const tpl = await buildExportEmail({ recipientName, exportName });
  return sendEmail(to, tpl.subject, tpl.text, tpl.html, 'export', attachments);
};

const sendDueNotificationEmail = async (student, due) => {
  const brand = await getBranding();
  const html = `<p>Hello ${student.full_name}, a new due has been assigned to you.</p><p><strong>${due.name}</strong> - GHS ${due.amount}</p>`;
  return sendEmail(student.email, `New Due Assigned - ${brand.appName}`, html, 'due_notification');
};

const sendReminderEmail = async (student, due, outstanding) => {
  const brand = await getBranding();
  const html = `<p>Hello ${student.full_name}, this is a reminder that you have an outstanding balance of GHS ${outstanding} for ${due.name}.</p>`;
  return sendEmail(student.email, `Outstanding Due Reminder - ${brand.appName}`, html, 'reminder');
};

module.exports = {
  sendEmail,
  sendSignupEmail,
  sendPaymentConfirmationEmail,
  sendClearanceEmail,
  sendExportEmail,
  sendDueNotificationEmail,
  sendReminderEmail
};
