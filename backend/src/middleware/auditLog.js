const { pool } = require('../config/database');
const { generateUUID } = require('../utils/uuid');

const auditLog = (action, resourceType = null) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    // Override json so successful/failed write actions can be captured without
    // making the API response depend on the audit insert succeeding.
    res.json = function (data) {
      if (req.user && req.method !== 'GET') {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const params = req.params && typeof req.params === 'object' ? req.params : {};

        const auditData = {
          user_id: req.user.id,
          action,
          resource_type: resourceType,
          resource_id: params.id || body.id || null,
          old_values: body.oldValues || null,
          new_values: req.method === 'DELETE' ? null : body,
          ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
          user_agent: req.headers['user-agent'] || null
        };

        try {
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
        } catch (err) {
          // Audit logging must never break the actual API action/response.
          console.error('Audit log setup error:', err);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = { auditLog };
