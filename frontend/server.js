const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 提供靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// 首頁路由
app.get('/', (req, res) => {
    res.redirect('/test.html');
});

// 健康檢查
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '前端伺服器運行正常',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`🌐 前端伺服器已啟動在 http://localhost:${PORT}`);
    console.log(`📱 測試頁面: http://localhost:${PORT}/test.html`);
    console.log(`🔧 健康檢查: http://localhost:${PORT}/health`);
});

// 錯誤處理
app.use((err, req, res, next) => {
    console.error('伺服器錯誤:', err);
    res.status(500).json({
        error: '內部伺服器錯誤',
        message: err.message
    });
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({
        error: '找不到頁面',
        path: req.path,
        suggestion: '請訪問 /test.html 查看測試頁面'
    });
});