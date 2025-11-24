const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未授權'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: '權限不足',
          message: `此功能僅限 ${allowedRoles.join(', ')} 角色存取`
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: '權限檢查失敗'
      });
    }
  };
};

module.exports = roleCheck;
