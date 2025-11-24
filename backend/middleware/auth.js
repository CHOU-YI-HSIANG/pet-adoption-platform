const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT 認證中間件
const auth = async (req, res, next) => {
  try {
    console.log('=== Auth 中間件 ===');
    console.log('請求路徑:', req.method, req.path);
    console.log('Authorization Header:', req.headers.authorization ? '存在' : '不存在');
    
    let token;

    // 從 Header 中取得 token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 檢查 token 是否存在
    if (!token) {
      console.log('❌ Token 不存在');
      return res.status(401).json({
        success: false,
        message: '未提供認證令牌，請先登入'
      });
    }
    
    console.log('✅ Token 存在,長度:', token.length);

    try {
      // 驗證 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('✅ Token 驗證成功, userId:', decoded.userId || decoded.id);
      
      // 從資料庫取得用戶資訊 (支援 userId 和 id 兩種格式)
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        console.log('❌ 用戶不存在');
        return res.status(401).json({
          success: false,
          message: '認證失敗,用戶不存在'
        });
      }
      
      console.log('✅ 用戶找到:', user.email);

      // 檢查用戶是否啟用
      if (!user.isActive) {
        console.log('❌ 用戶未啟用');
        return res.status(401).json({
          success: false,
          message: '帳號已被停用，請聯繫管理員'
        });
      }

      // 將用戶資訊附加到請求對象
      req.user = user;
      console.log('✅ Auth 通過,進入下一個中間件');
      next();

    } catch (jwtError) {
      console.error('JWT 驗證錯誤:', jwtError);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '認證令牌已過期，請重新登入'
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: '無效的認證令牌'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: '認證失敗'
      });
    }

  } catch (error) {
    console.error('認證中間件錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
};

// 可選認證中間件（不強制要求登入）
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId || decoded.id;
        const user = await User.findById(userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (jwtError) {
        // 忽略 JWT 錯誤，繼續處理請求
        console.log('可選認證失敗:', jwtError.message);
      }
    }

    next();
  } catch (error) {
    console.error('可選認證中間件錯誤:', error);
    next(); // 即使出錯也繼續處理
  }
};

// 權限檢查中間件
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '請先登入'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '沒有權限執行此操作'
      });
    }

    next();
  };
};

// 檢查帳號所有權或管理員權限
const checkOwnershipOrAdmin = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '請先登入'
      });
    }

    // 管理員可以執行任何操作
    if (req.user.role === 'admin') {
      return next();
    }

    // 檢查是否為資源擁有者
    const resourceUserId = req.params[resourceField] || req.body[resourceField];
    
    if (resourceUserId && resourceUserId.toString() === req.user.id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: '只能操作自己的資源'
    });
  };
};

// 檢查電子郵件驗證狀態
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '請先登入'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: '請先驗證您的電子郵件地址'
    });
  }

  next();
};

module.exports = {
  auth,
  optionalAuth,
  authorize,
  checkOwnershipOrAdmin,
  requireEmailVerification
};