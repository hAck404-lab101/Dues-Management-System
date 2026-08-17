const { pool } = require('../config/database');

function requirePermission(...permissionKeys) {
  // Flatten array if passed as array
  const keys = permissionKeys.flat();

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { role, id: userId } = req.user;

      // Admin role gets absolute access bypass
      if (role === 'admin') {
        return next();
      }

      // Executive staff roles get access to shared executive views.
      const executiveStaffRoles = ['admin', 'president', 'treasurer', 'financial_secretary'];
      const executiveViewPermissions = ['dashboard.executive', 'payments.view_all', 'reports.export'];
      if (executiveStaffRoles.includes(role) && keys.some((key) => executiveViewPermissions.includes(key))) {
        return next();
      }

      // The president manages the complete dues lifecycle. Keep this scoped to dues
      // so unrelated sensitive controls still use their explicit permission rows.
      const presidentDuesPermissions = ['dues.create', 'dues.edit', 'dues.assign', 'dues.view'];
      if (role === 'president' && keys.some((key) => presidentDuesPermissions.includes(key))) {
        return next();
      }

      // Check if role has any of the specified permissions or wildcard
      const placeholders = keys.map(() => '?').join(', ');
      const queryStr = `
        SELECT 1 FROM role_permissions 
        WHERE role = ? AND (permission_key IN (${placeholders}) OR permission_key = '*')
      `;
      const { rows } = await pool.query(queryStr, [role, ...keys]);

      if (rows.length === 0) {
        console.warn(`[Permission Denied] User ${userId} (${role}) attempted to access resource requiring one of: ${keys.join(', ')}`);
        
        // Log to system_logs if logger is available
        try {
          const sysLog = require('../lib/systemLogger');
          if (sysLog && typeof sysLog.warn === 'function') {
            await sysLog.warn(
              'auth',
              'permission.denied',
              `User attempted to access unauthorized resource. Required one of: ${keys.join(', ')}`,
              { userId, role, requiredPermissions: keys },
              { relatedUserId: userId, ip: req.ip || req.headers['x-forwarded-for'] }
            );
          }
        } catch (_) {
          // Logger not initialized yet, skip
        }

        return res.status(403).json({
          success: false,
          message: 'Forbidden: Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error checking permissions'
      });
    }
  };
}

module.exports = requirePermission;
