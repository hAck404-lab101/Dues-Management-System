require('dotenv').config();
const { query } = require('../src/config/database');

const replacements = [
  {
    key: 'app_name',
    value: process.env.DEFAULT_APP_NAME || 'Dues Management System',
    match: '%UCC%'
  },
  {
    key: 'sms_sender_id',
    value: process.env.DEFAULT_SMS_SENDER_ID || 'DUES',
    match: '%UCC%'
  },
  {
    key: 'email_from',
    value: process.env.DEFAULT_EMAIL_FROM || 'no-reply@example.com',
    match: '%ucc%'
  },
  {
    key: 'email_from_name',
    value: process.env.DEFAULT_EMAIL_FROM_NAME || 'Dues Management System',
    match: '%UCC%'
  },
  {
    key: 'manual_payment_bank',
    value: process.env.DEFAULT_MANUAL_PAYMENT_BANK || 'Bank Account: 1234567890, Branch: Main',
    match: '%UCC%'
  }
];

const run = async () => {
  try {
    console.log('Cleaning old UCC branding/settings...');

    for (const item of replacements) {
      const result = await query(
        'UPDATE settings SET `value` = ? WHERE `key` = ? AND `value` LIKE ?',
        [item.value, item.key, item.match]
      );
      const changed = result?.rows?.affectedRows ?? result?.affectedRows ?? 0;
      console.log(`${item.key}: updated ${changed} row(s)`);
    }

    await query("UPDATE settings SET `value` = REPLACE(`value`, 'UCC Dues', 'Dues') WHERE `value` LIKE '%UCC Dues%'");
    await query("UPDATE settings SET `value` = REPLACE(`value`, 'UCC', '') WHERE `value` LIKE '%UCC%'");

    console.log('Cleanup complete. Restart/redeploy backend and refresh frontend.');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

run();
