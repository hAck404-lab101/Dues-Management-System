const { pool } = require('../config/database');
const { generateUUID } = require('../utils/uuid');

const auditLog = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (data) {
      // Log the action
      if (req.user && req.method !== 'GET') {
        const auditData = {
          user_id: req.user.id,
          action: action,
          resource_type: resourceType,
          resource_id: req.params.id || req.body.id || null,
          old_values: req.body.oldValues || null,
          new_values: req.method === 'DELETE' ? null : req.body,
          ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        };

        // Don't wait for audit log to complete
        const logId = generateUUID();
        pool.query(
          `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logId,
            auditData.user_id,
            auditData.action,
            auditData.resource_type,
            auditData.resource_id,
            JSON.stringify(auditData.old_values),
            JSON.stringify(auditData.new_values),
            auditData.ip_address,
            auditData.user_agent
          ]
        ).catch(err => console.error('Audit log error:', err));
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = { auditLog };

