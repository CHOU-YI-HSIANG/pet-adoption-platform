const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const passport = require('passport');
const session = require('express-session');
const morgan = require('morgan');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO 設定 - 支援多個來源
const socketOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : (process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000']);

const io = socketIo(server, {
  cors: {
    origin: socketOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 將 io 實例附加到 app，供路由使用
app.set('io', io);

// 安全性中間件
app.use(helmet({
  crossOriginResourcePolicy: false // 允許載入靜態資源
}));

// 壓縮中間件
app.use(compression());

// 全域速率限制 - 開發環境更寬鬆
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 開發環境: 1000, 生產環境: 100
  message: {
    error: '請求過於頻繁，請稍後再試'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 註冊/登入專用限制 - 防止暴力破解
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // 開發環境: 50次, 生產環境: 5次
  message: {
    error: '嘗試次數過多，請稍後再試'
  },
  skipSuccessfulRequests: true // 成功的請求不計入限制
});

// 中間件設定
app.use(limiter);

// HTTP 請求日誌 (morgan + winston)
app.use(morgan('combined', { stream: logger.stream }));

// DEBUG: 記錄所有請求
app.use((req, res, next) => {
  console.log(`\n🔵 ${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Headers:', req.headers.authorization ? `Bearer ${req.headers.authorization.substring(0, 20)}...` : 'No Auth');
  next();
});

// CORS 設定 - 支援多個來源
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : (process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000']);

app.use(cors({
  origin: function (origin, callback) {
    // 允許沒有 origin 的請求 (如 Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn('CORS 拒絕來源:', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session 設定 (Google OAuth 需要)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 生產環境使用 HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 小時
  }
}));

// Passport 初始化
app.use(passport.initialize());
app.use(passport.session());

// 靜態檔案服務
app.use('/uploads', express.static('uploads'));

// 資料庫連接設定
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // 5秒超時
  socketTimeoutMS: 45000, // 45秒超時
  family: 4 // 使用 IPv4，避免 IPv6 問題
};

// 資料庫連接（增加重試與詳細日誌）
const connectWithRetry = async (retries, delayMs) => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_adoption';

  // 決定參數來源（argument > env > default）
  const maxRetries = typeof retries === 'number' ? retries : (parseInt(process.env.DB_CONNECT_MAX_RETRIES, 10) || 5);
  const retriesSource = typeof retries === 'number' ? 'argument' : (process.env.DB_CONNECT_MAX_RETRIES ? 'env' : 'default');
  let waitMs = typeof delayMs === 'number' ? delayMs : (parseInt(process.env.DB_CONNECT_DELAY_MS, 10) || 2000);
  const delaySource = typeof delayMs === 'number' ? 'argument' : (process.env.DB_CONNECT_DELAY_MS ? 'env' : 'default');

  logger.info('DB connect config', { maxRetries, retriesSource, initialDelayMs: waitMs, delaySource });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`DB connect attempt ${attempt}/${maxRetries}`);
      await mongoose.connect(uri, mongooseOptions);
      logger.info('✅ 已連接到 MongoDB 資料庫');
      logger.info('📊 資料庫:', mongoose.connection.name);
      return;
    } catch (error) {
      // 紀錄每次失敗的精簡資訊，避免輸出完整 stack
      const maskedUri = uri.replace(/:\/\/.*@/, '://***@');
      logger.error('❌ MongoDB 連接失敗', {
        attempt,
        maxRetries,
        uri: maskedUri,
        message: error.message,
        code: error.code,
      });

      if (attempt < maxRetries) {
        logger.info(`🔁 等待 ${waitMs}ms 後重試（第 ${attempt + 1} 次）`);
        await new Promise(r => setTimeout(r, waitMs));
        waitMs = Math.min(waitMs * 2, 30000); // 指數退避
      } else {
        logger.warn('📝 已達到最大重試次數，伺服器將繼續啟動，但資料庫功能可能不可用');
      }
    }
  }
};

// 立即啟動連線重試（非阻塞），允許透過環境變數覆寫參數
const initialDbRetries = parseInt(process.env.DB_CONNECT_MAX_RETRIES, 10) || 5;
const initialDbDelayMs = parseInt(process.env.DB_CONNECT_DELAY_MS, 10) || 2000;
connectWithRetry(initialDbRetries, initialDbDelayMs).catch(err => {
  logger.error('連接流程異常', { error: err && err.message });
});

// 設定 mongoose 連接錯誤處理
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB 連接錯誤', { 
    error: error.message,
    code: error.code 
  });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB 連接已斷開');
  logger.info('🔄 正在嘗試重新連接...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB 已重新連接');
});

// Socket.IO 連接處理
io.on('connection', (socket) => {
  logger.info('Socket.IO: 用戶已連接', { socketId: socket.id });

  // 用戶加入房間（基於用戶 ID）
  socket.on('join', (userId) => {
    socket.join(userId);
    logger.debug(`Socket.IO: 用戶加入房間`, { userId, socketId: socket.id });
    console.log(`Socket.IO debug: socketId=${socket.id} joined user room=${userId}`);
  });

  // 發送訊息
  socket.on('sendMessage', (data) => {
    const { receiverId, message } = data;
    // 向接收者發送訊息
    socket.to(receiverId).emit('newMessage', message);
    logger.debug('Socket.IO: 訊息已發送', { receiverId, socketId: socket.id });
  });

  // 訊息已讀通知
  socket.on('messageRead', (data) => {
    const { senderId, messageId } = data;
    socket.to(senderId).emit('messageReadConfirm', { messageId });
    logger.debug('Socket.IO: 訊息已讀確認', { messageId, senderId });
  });

  // 正在輸入通知
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    socket.to(receiverId).emit('userTyping', { isTyping, userId: socket.userId });
  });

  // 斷線處理
  socket.on('disconnect', () => {
    logger.info('Socket.IO: 用戶已斷線', { socketId: socket.id });
  });
});

// 路由設定
app.use('/api/auth', authLimiter, require('./routes/auth')); // 套用認證專用限制器
app.use('/api/pets', require('./routes/pets'));
app.use('/api/adoptions', require('./routes/adoptions'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications')); // Story 3.1
app.use('/api/stats', require('./routes/stats')); // 公共首頁統計
app.use('/api/recommendations', require('./routes/recommendations')); // Story 1.2
app.use('/api/matching', require('./routes/matching')); // Story 3.2
app.use('/api/browsing-history', require('./routes/browsing-history')); // Story 1.3
app.use('/api/users', require('./routes/user-stats')); // Story 3.3 - User Dashboard Stats
app.use('/api/shelters', require('./routes/shelters')); // Story 3.4 - Shelter Dashboard
app.use('/api/data-import', require('./routes/data-import')); // 政府資料匯入功能

// 開發用 debug route（僅在 development 模式啟用）
try {
  app.use('/api/debug', require('./routes/debug-notifications'));
} catch (e) {
  logger.warn('無法載入 debug 路由', { error: e.message });
}

// Swagger API 文件
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '寵物認養平台 API 文件',
}));

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Readiness endpoint: returns 200 only when DB connected
app.get('/api/ready', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  if (dbState === 1) {
    return res.status(200).json({ ready: true, database: 'connected' });
  }
  return res.status(503).json({ ready: false, database: dbState === 0 ? 'disconnected' : 'connecting' });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康檢查
 *     description: 檢查 API 服務是否正常運作
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API 正常運作
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: 動物認養平台 API 運行中
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '動物認養平台 API 運行中',
    timestamp: new Date().toISOString(),
    features: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      socketIO: 'enabled',
      uploads: 'enabled',
      security: 'helmet + rate-limiting'
    }
  });
});

// API 總覽端點
app.get('/api', (req, res) => {
  res.json({
    name: '動物認養平台 API',
    version: '2.0.0',
    description: '提供寵物認養、社群功能和即時通訊的完整 API',
    endpoints: {
      auth: '/api/auth - 用戶認證',
      pets: '/api/pets - 寵物管理',
      adoptions: '/api/adoptions - 認養申請',
      users: '/api/users - 用戶管理',
      posts: '/api/posts - 社群文章',
      comments: '/api/comments - 評論系統',
      messages: '/api/messages - 即時通訊'
    },
    realtime: {
      socketIO: '啟用中',
      features: ['即時通訊', '訊息已讀狀態', '輸入狀態提示']
    }
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '找不到請求的資源',
    path: req.originalUrl,
    suggestion: '請查看 /api 了解可用的端點'
  });
});

// 全域錯誤處理
app.use((error, req, res, next) => {
  logger.error('伺服器錯誤', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Multer 檔案上傳錯誤
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: '檔案大小超過限制',
      maxSize: '10MB'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: '上傳的檔案超過數量限制'
    });
  }
  
  // MongoDB 驗證錯誤
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: '資料驗證失敗',
      details: Object.values(error.errors).map(err => err.message)
    });
  }
  
  // MongoDB Cast 錯誤
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: '無效的資料格式',
      field: error.path
    });
  }
  
  // 重複鍵錯誤
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      error: `${field} 已存在，請使用其他值`
    });
  }
  
  // JWT 錯誤
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '無效的認證令牌'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: '認證令牌已過期'
    });
  }
  
  res.status(500).json({
    error: '伺服器內部錯誤',
    message: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
  });
});

const PORT = process.env.PORT || 5000;

// 在啟動前為 server 加上錯誤處理，當埠被佔用時給予清楚提示
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`🚨 無法啟動伺服器：埠 ${PORT} 已被其他程序佔用。請解除佔用或指定其他 PORT 後重試。`);
    process.exit(1);
  }
  console.error('Server error', err);
});

server.listen(PORT, () => {
  logger.info(`🚀 伺服器運行在 http://localhost:${PORT}`);
  logger.info(`📚 API 總覽: http://localhost:${PORT}/api`);
  logger.info(`🔍 健康檢查: http://localhost:${PORT}/api/health`);
  logger.info(`💬 Socket.IO 即時通訊已啟用`);
  logger.info(`🔒 安全性功能已啟用 (Helmet + Rate Limiting)`);
  logger.info(`📝 結構化日誌系統已啟用 (Winston + Morgan)`);
});

// 導出 app 和 io 供其他模組使用
module.exports = app;
module.exports.io = io;

// 全域未捕捉例外/拒絕攔截，記錄並在開發環境嘗試優雅退出
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { reason: reason && reason.stack ? reason.stack : reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', { error: err && err.stack ? err.stack : err });
  if (process.env.NODE_ENV !== 'development') {
    // 在生產環境建議重啟進程
    process.exit(1);
  }
});