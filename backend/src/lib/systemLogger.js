const { pool } = require('../config/database');
const { generateUUID } = require('../utils/uuid');

// Redaction function to sanitize sensitive info
function redact(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Redact Paystack secrets and publishable keys patterns (matching word chars, dots, and dashes)
    let redacted = obj.replace(/(?:sk|pk)_(?:test|live)_[a-zA-Z0-9._-]+/g, '[REDACTED]');
    // Redact general sk_* or pk_* patterns
    redacted = redacted.replace(/(?:sk|pk)_[a-zA-Z0-9._-]+/g, '[REDACTED]');
    // Redact JWT patterns (header.payload.signature)
    redacted = redacted.replace(/eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g, '[REDACTED]');
    return redacted;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item));
  }

  if (typeof obj === 'object') {
    const copy = {};
    const sensitiveKeys = ['password', 'secret', 'token', 'authorization', 'cookie', 'card_number', 'cvv', 'pin', 'key'];
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));
      if (isSensitive) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = redact(obj[key]);
      }
    }
    return copy;
  }

  return obj;
}

async function writeLog(level, category, event, message, context = null, relatedIds = {}) {
  try {
    const id = generateUUID();
    
    // Extract related IDs
    const related_payment_id = relatedIds.paymentId || relatedIds.relatedPaymentId || null;
    const related_user_id = relatedIds.userId || relatedIds.relatedUserId || null;
    const related_student_id = relatedIds.studentId || relatedIds.relatedStudentId || null;
    const ip = relatedIds.ip || null;

    // Apply redaction to context
    let redactedContext = null;
    if (context) {
      redactedContext = JSON.stringify(redact(context));
    }

    // Insert into DB
    await pool.query(
      `INSERT INTO system_logs (
        id, category, level, event, message, context, 
        related_payment_id, related_user_id, related_student_id, ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, category, level, event, message, redactedContext,
        related_payment_id, related_user_id, related_student_id, ip
      ]
    );
  } catch (error) {
    // Fallback to console if DB write fails to avoid breaking request flow
    console.error('System log write failed:', error, {
      level, category, event, message, context, relatedIds
    });
  }
}

const debug = (category, event, message, context = null, relatedIds = {}) => 
  writeLog('debug', category, event, message, context, relatedIds);

const info = (category, event, message, context = null, relatedIds = {}) => 
  writeLog('info', category, event, message, context, relatedIds);

const warn = (category, event, message, context = null, relatedIds = {}) => 
  writeLog('warn', category, event, message, context, relatedIds);

const error = (category, event, message, context = null, relatedIds = {}) => 
  writeLog('error', category, event, message, context, relatedIds);

const critical = (category, event, message, context = null, relatedIds = {}) => 
  writeLog('critical', category, event, message, context, relatedIds);

module.exports = {
  debug,
  info,
  warn,
  error,
  critical,
  redact
};
