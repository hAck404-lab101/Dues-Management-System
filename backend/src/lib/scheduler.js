const { pool } = require('../config/database');
const paystackService = require('../services/paystackService');
const sysLog = require('./systemLogger');
const { generateUUID } = require('../utils/uuid');

// Daily job at 2am: Reconciliation
const runReconciliationJob = async () => {
  try {
    await sysLog.info('job', 'job.reconciliation.start', 'Starting Paystack daily reconciliation task');
    
    // Fetch last 48 hours transactions from Paystack
    const fromTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const paystackResult = await paystackService.listTransactions({
      from: fromTime,
      perPage: 100
    });

    if (!paystackResult.success) {
      await sysLog.error('job', 'job.reconciliation.failed', 'Failed to fetch Paystack transactions', { error: paystackResult.error });
      return;
    }

    const txs = paystackResult.data || [];
    let issuesFound = 0;

    for (const tx of txs) {
      const reference = tx.reference;
      if (!reference) continue;

      // 1. Look up payment in DB
      const { rows: dbRows } = await pool.query(
        'SELECT id, amount, service_fee, status FROM payments WHERE paystack_reference = ? LIMIT 1',
        [reference]
      );

      const paystackAmount = Number(tx.amount || 0) / 100;
      const paystackStatus = tx.status; // success, failed, abandoned

      if (dbRows.length === 0) {
        // Issue: missing in DB (if transaction was successful in Paystack)
        if (paystackStatus === 'success') {
          const issueId = generateUUID();
          await pool.query(
            `INSERT INTO reconciliation_issues (id, payment_reference, paystack_amount, db_amount, paystack_status, db_status, issue_description, status)
             VALUES (?, ?, ?, 0.00, ?, 'missing', 'Transaction present in Paystack logs but missing in local Database.', 'unresolved')
             ON DUPLICATE KEY UPDATE paystack_status = VALUES(paystack_status), db_status = VALUES(db_status), paystack_amount = VALUES(paystack_amount)`,
            [issueId, reference, paystackAmount, paystackStatus]
          );
          issuesFound++;
        }
      } else {
        const payment = dbRows[0];
        const dbAmount = Number(payment.amount);
        const dbServiceFee = Number(payment.service_fee || 0);
        const totalLocalAmount = dbAmount + dbServiceFee;
        const dbStatus = payment.status;

        let hasIssue = false;
        let description = '';

        // Status Mismatch
        if (paystackStatus === 'success' && (dbStatus === 'pending' || dbStatus === 'rejected')) {
          hasIssue = true;
          description = 'Status mismatch. Paystack shows success, DB shows pending/rejected.';
        }
        // Amount Mismatch
        else if (Math.abs(totalLocalAmount - paystackAmount) > 0.01) {
          hasIssue = true;
          description = `Amount mismatch. Paystack amount (GHS ${paystackAmount.toFixed(2)}) differs from local DB total amount (GHS ${totalLocalAmount.toFixed(2)}).`;
        }

        if (hasIssue) {
          const issueId = generateUUID();
          await pool.query(
            `INSERT INTO reconciliation_issues (id, payment_reference, paystack_amount, db_amount, paystack_status, db_status, issue_description, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'unresolved')
             ON DUPLICATE KEY UPDATE paystack_status = VALUES(paystack_status), db_status = VALUES(db_status), paystack_amount = VALUES(paystack_amount), db_amount = VALUES(db_amount), issue_description = VALUES(issue_description)`,
            [issueId, reference, paystackAmount, totalLocalAmount, paystackStatus, dbStatus, description]
          );
          issuesFound++;
        }
      }
    }

    await sysLog.info('job', 'job.reconciliation.success', `Reconciliation completed successfully. Checked ${txs.length} transactions, flagged ${issuesFound} issues.`, { checkedCount: txs.length, issuesFound });
  } catch (error) {
    console.error('Reconciliation job error:', error);
    await sysLog.error('job', 'job.reconciliation.error', 'Uncaught error in reconciliation task', { error: error.message });
  }
};

// Daily job at 3am: Logs retention cleanup
const runLogsRetentionJob = async () => {
  try {
    await sysLog.info('job', 'job.cleanup.start', 'Starting system logs retention cleanup task');

    // Retrieve retention days from settings, fallback to defaults
    const getSetting = async (key, fallback) => {
      const { rows } = await pool.query('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [key]);
      return rows[0]?.value ? parseInt(rows[0].value, 10) : fallback;
    };

    const debugInfoDays = await getSetting('log_retention_debug_info_days', 90);
    const warnErrorDays = await getSetting('log_retention_warn_error_days', 365);

    // 1. Delete debug/info logs older than debugInfoDays
    const [debugRes] = await pool.query(
      `DELETE FROM system_logs 
       WHERE level IN ('debug', 'info') 
         AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [debugInfoDays]
    );

    // 2. Delete warn/error/critical logs older than warnErrorDays
    const [warnRes] = await pool.query(
      `DELETE FROM system_logs 
       WHERE level IN ('warn', 'error', 'critical') 
         AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [warnErrorDays]
    );

    const deletedDebug = debugRes.affectedRows || 0;
    const deletedWarn = warnRes.affectedRows || 0;

    await sysLog.info('job', 'job.cleanup.success', `Logs retention cleanup completed. Deleted ${deletedDebug} debug/info logs and ${deletedWarn} warn/error logs.`, { deletedDebug, deletedWarn });
  } catch (error) {
    console.error('Logs retention job error:', error);
    await sysLog.error('job', 'job.cleanup.error', 'Uncaught error in logs retention task', { error: error.message });
  }
};

// Every 15 minutes: Check and publish scheduled announcements
const runAnnouncementsJob = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM announcements 
       WHERE is_published = 0 AND published_at IS NOT NULL AND published_at <= CURRENT_TIMESTAMP`
    );

    for (const ann of rows) {
      await pool.query(
        'UPDATE announcements SET is_published = 1 WHERE id = ?',
        [ann.id]
      );
      await sysLog.info('job', 'job.announcements.published', `Scheduled announcement "${ann.title}" is now published.`, { id: ann.id, title: ann.title });
    }
  } catch (error) {
    console.error('Announcements job error:', error);
    await sysLog.error('job', 'job.announcements.error', 'Uncaught error in announcements task', { error: error.message });
  }
};

// Schedule trigger logic
const scheduleDailyTask = (hour, minute, jobFunction) => {
  const scheduleNextRun = () => {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hour, minute, 0, 0);

    // If target hour has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    console.log(`Scheduled task for ${nextRun.toLocaleTimeString('en-GH')} (in ${(delay / 1000 / 60).toFixed(1)} mins)`);

    setTimeout(() => {
      // Run the job
      jobFunction().then(() => {
        // Re-schedule for next day
        scheduleNextRun();
      });
    }, delay);
  };

  scheduleNextRun();
};

const startScheduler = () => {
  console.log('Initializing scheduled background tasks...');
  // 2 AM Reconciliation
  scheduleDailyTask(2, 0, runReconciliationJob);
  // 3 AM Logs Retention Cleanup
  scheduleDailyTask(3, 0, runLogsRetentionJob);
  
  // Run announcements check immediately on start and then every 15 minutes
  runAnnouncementsJob();
  setInterval(runAnnouncementsJob, 15 * 60 * 1000);
};

module.exports = {
  startScheduler,
  runReconciliationJob,
  runLogsRetentionJob,
  runAnnouncementsJob
};
