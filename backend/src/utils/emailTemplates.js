const { pool } = require('../config/database');
const { buildPortalUrl, buildPublicPath } = require('./publicUrl');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getBranding = async () => {
  try {
    const { rows } = await pool.query(
      'SELECT `key`, `value` FROM settings WHERE `key` IN ("app_name", "app_description", "app_logo", "app_logo_secondary", "app_favicon", "primary_color", "secondary_color", "email_from_name")'
    );
    const settings = {};
    rows.forEach((row) => { settings[row.key] = row.value; });
    return {
      appName: settings.app_name || settings.email_from_name || 'Dues Management System',
      appDescription: settings.app_description || 'Secure student dues, payments, and receipts portal',
      primaryColor: settings.primary_color || '#0B3C5D',
      secondaryColor: settings.secondary_color || '#F2A900',
      logo: settings.app_logo || settings.app_logo_secondary || settings.app_favicon || ''
    };
  } catch (_) {
    return {
      appName: 'Dues Management System',
      appDescription: 'Secure student dues, payments, and receipts portal',
      primaryColor: '#0B3C5D',
      secondaryColor: '#F2A900',
      logo: ''
    };
  }
};

const absoluteUrl = (value = '') => {
  if (!value) return '';
  if (String(value).startsWith('http')) return value;
  return buildPublicPath(value);
};

const emailShell = ({ brand, preheader, title, subtitle, content, ctaText, ctaUrl }) => {
  const logoUrl = absoluteUrl(brand.logo);
  const safeAppName = escapeHtml(brand.appName);
  const safeSubtitle = escapeHtml(subtitle || brand.appDescription);
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader || title)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
        <tr><td style="background:${brand.primaryColor};padding:28px;text-align:center;color:#ffffff;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${safeAppName}" style="height:56px;max-width:160px;object-fit:contain;margin-bottom:14px;border-radius:10px;">` : ''}
          <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">${safeAppName}</h1>
          <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.78);">${safeSubtitle}</p>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <h2 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:${brand.primaryColor};font-weight:800;">${safeTitle}</h2>
          ${content}
          ${ctaText && ctaUrl ? `<div style="text-align:center;margin-top:30px;"><a href="${ctaUrl}" style="display:inline-block;background:${brand.secondaryColor};color:#111827;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:800;font-size:14px;">${escapeHtml(ctaText)}</a></div>` : ''}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:18px 28px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">This is an automated message from ${safeAppName}. Please keep this email for your records.</p>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:11px;">© ${new Date().getFullYear()} ${safeAppName}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

const detailsTable = (rows = []) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;margin:22px 0;overflow:hidden;">
    ${rows.map(([label, value]) => `<tr><td style="padding:12px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</td><td style="padding:12px 14px;color:#111827;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td></tr>`).join('')}
  </table>`;

const buildSignupEmail = async ({ student }) => {
  const brand = await getBranding();
  const portalUrl = buildPortalUrl();
  const content = `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">Hello ${escapeHtml(student.full_name || student.fullName || 'Student')}, your student account has been created successfully.</p>
    ${detailsTable([['Index Number', student.student_id || student.indexNumber || ''], ['Email', student.email || ''], ['Programme', student.programme || ''], ['Academic Year', student.academic_year || student.academicYear || '']])}
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">You can now log in to view dues, make payments, and download official receipts.</p>`;
  return { subject: `Welcome to ${brand.appName}`, text: `Hello ${student.full_name || student.fullName || 'Student'}, your account has been created successfully on ${brand.appName}.`, html: emailShell({ brand, title: 'Welcome to your student portal', preheader: 'Your account has been created successfully.', content, ctaText: portalUrl ? 'Open Student Portal' : '', ctaUrl: portalUrl }) };
};

const buildPaymentReceiptEmail = async ({ student, payment, receipt, receiptUrl }) => {
  const brand = await getBranding();
  const portalUrl = buildPortalUrl();
  const amount = Number(receipt?.amount_paid || payment?.amount || 0).toFixed(2);
  const content = `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">Hello ${escapeHtml(student.full_name || 'Student')}, your payment has been confirmed and your receipt is ready.</p>
    ${detailsTable([['Receipt Number', receipt?.receipt_number || ''], ['Due', payment?.due_name || 'Payment'], ['Amount Paid', `GHS ${amount}`], ['Payment Method', String(payment?.payment_method || '').replace(/_/g, ' ').toUpperCase()], ['Date', new Date(payment?.created_at || Date.now()).toLocaleDateString('en-GH')]])}
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">A PDF copy may be attached. You can also log in to your dashboard to download the receipt securely.</p>`;
  return { subject: `Payment Receipt ${receipt?.receipt_number || ''} - ${brand.appName}`, text: `Hello ${student.full_name || 'Student'}, your payment of GHS ${amount} has been confirmed. Receipt: ${receipt?.receipt_number || ''}. Verify: ${receiptUrl || ''}`, html: emailShell({ brand, title: 'Payment Confirmed', preheader: 'Your payment receipt is ready.', content, ctaText: receiptUrl ? 'Verify Receipt' : (portalUrl ? 'Open Dashboard' : ''), ctaUrl: receiptUrl || portalUrl }) };
};

const buildClearanceEmail = async ({ student, clearanceStatus, attachmentNote = '' }) => {
  const brand = await getBranding();
  const portalUrl = buildPortalUrl();
  const content = `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">Hello ${escapeHtml(student.full_name || 'Student')}, your clearance document has been generated.</p>
    ${detailsTable([['Index Number', student.student_id || ''], ['Programme', student.programme || ''], ['Status', clearanceStatus || 'Generated'], ['Generated On', new Date().toLocaleDateString('en-GH')]])}
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">${escapeHtml(attachmentNote || 'Please find the clearance PDF attached to this email if your administrator enabled attachments.')}</p>`;
  return { subject: `Clearance Document - ${brand.appName}`, text: `Hello ${student.full_name || 'Student'}, your clearance document has been generated. Status: ${clearanceStatus || 'Generated'}.`, html: emailShell({ brand, title: 'Clearance Document Generated', preheader: 'Your clearance document is ready.', content, ctaText: portalUrl ? 'Open Portal' : '', ctaUrl: portalUrl }) };
};

const buildExportEmail = async ({ recipientName = 'Admin', exportName = 'Export File' }) => {
  const brand = await getBranding();
  const content = `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">Hello ${escapeHtml(recipientName)}, your requested export is ready.</p>${detailsTable([['Export', exportName], ['Generated On', new Date().toLocaleString('en-GH')]])}<p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">The export file is attached where supported.</p>`;
  return { subject: `${exportName} - ${brand.appName}`, text: `${exportName} is ready.`, html: emailShell({ brand, title: 'Export Ready', preheader: 'Your export file is ready.', content }) };
};

module.exports = { getBranding, buildSignupEmail, buildPaymentReceiptEmail, buildClearanceEmail, buildExportEmail, emailShell, detailsTable, escapeHtml, absoluteUrl };
