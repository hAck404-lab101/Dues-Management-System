const requirePermission = require('./requirePermission');

module.exports = (...permissions) => {
  const staffPermission = requirePermission(...permissions);

  return (req, res, next) => {
    if (req.user?.role === 'student') return next();
    return staffPermission(req, res, next);
  };
};
