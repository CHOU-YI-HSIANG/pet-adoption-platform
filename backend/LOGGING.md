# 結構化日誌系統使用指南

## 概述

本專案使用 Winston 3.11.0 作為結構化日誌解決方案,結合 Morgan 中間件記錄 HTTP 請求。

## 日誌等級

- `error`: 錯誤訊息 (例如：資料庫錯誤、API 失敗)
- `warn`: 警告訊息 (例如：找不到資源、驗證失敗)
- `info`: 資訊訊息 (例如：成功操作、系統狀態)
- `http`: HTTP 請求日誌 (自動由 Morgan 記錄)
- `debug`: 除錯訊息 (開發環境使用)

## 使用方式

### 基本用法

```javascript
const logger = require('../utils/logger');

// 簡單訊息
logger.info('使用者註冊成功');
logger.warn('資源未找到');
logger.error('資料庫連接失敗');

// 帶有 metadata 的日誌
logger.info('使用者登入', { userId: '123', email: 'user@example.com' });
logger.error('API 錯誤', { 
  error: error.message, 
  stack: error.stack,
  userId: req.user?._id 
});
```

### HTTP 請求日誌

HTTP 請求會自動通過 Morgan 中間件記錄:

```javascript
// server.js 中已配置
app.use(morgan('combined', { stream: logger.stream }));
```

## 日誌輸出

### 開發環境 (NODE_ENV !== 'production')
- **輸出**: Console (彩色格式,易於閱讀)
- **等級**: debug 及以上

### 生產環境 (NODE_ENV === 'production')
- **輸出**: 
  - Console (JSON 格式)
  - `logs/error.log` (僅 error 等級)
  - `logs/combined.log` (所有等級)
- **等級**: info 及以上
- **檔案輪替**: 每個檔案最大 5MB,保留最新 5 個檔案

## 日誌格式

### JSON 格式 (生產環境)
```json
{
  "timestamp": "2025-11-09 18:55:03",
  "level": "info",
  "message": "使用者登入成功",
  "metadata": {
    "userId": "673f1234abcd5678ef901234",
    "email": "user@example.com",
    "ip": "::1"
  }
}
```

### 彩色格式 (開發環境)
```
2025-11-09 18:55:03 [info]: 使用者登入成功
{
  "userId": "673f1234abcd5678ef901234",
  "email": "user@example.com"
}
```

## 最佳實踐

1. **使用適當的日誌等級**:
   - `error`: 需要立即關注的問題
   - `warn`: 潛在問題或異常情況
   - `info`: 重要的業務事件
   - `debug`: 除錯資訊

2. **包含相關 context**:
   ```javascript
   logger.error('認證失敗', {
     userId: req.user?._id,
     ip: req.ip,
     url: req.originalUrl,
     error: error.message
   });
   ```

3. **避免記錄敏感資訊**:
   - 不要記錄密碼
   - 不要記錄完整的信用卡號
   - 小心記錄個人識別資訊 (PII)

4. **結構化 metadata**:
   ```javascript
   // Good ✅
   logger.info('訂單建立', { 
     orderId: order._id, 
     userId: user._id,
     amount: order.total 
   });
   
   // Bad ❌
   logger.info(`訂單 ${order._id} 建立，金額 ${order.total}`);
   ```

## 已實作的日誌記錄點

目前系統已在以下位置實作日誌記錄:

1. **server.js** (8個):
   - MongoDB 連接狀態
   - Socket.IO 連接事件
   - 全域錯誤處理
   - 伺服器啟動資訊

2. **routes/auth.js** (11個):
   - JWT 認證失敗
   - 使用者註冊 (成功/失敗)
   - 使用者登入 (成功/失敗)
   - Google OAuth 流程

3. **routes/pets.js** (3個):
   - 寵物列表查詢錯誤
   - 寵物詳情查詢錯誤
   - 寵物不存在警告

4. **HTTP 請求** (全部):
   - 所有 HTTP 請求自動記錄

**總計: 22+ 個日誌記錄點**

## 環境變數

```env
# 日誌等級 (預設: development=debug, production=info)
LOG_LEVEL=info

# Node 環境
NODE_ENV=production
```

## 測試

執行日誌系統測試:

```bash
npm test tests/logging.test.js
```

## 查看日誌

### 開發環境
直接在 console 查看彩色輸出

### 生產環境
```bash
# 查看錯誤日誌
cat logs/error.log

# 查看所有日誌
cat logs/combined.log

# 即時監控
tail -f logs/combined.log

# 搜尋特定關鍵字
grep "使用者登入" logs/combined.log
```

## 日誌分析

JSON 格式的日誌可以輕鬆匯入日誌分析工具:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Datadog
- CloudWatch (AWS)

## 疑難排解

### 日誌檔案未產生
1. 確認 `logs/` 資料夾存在
2. 確認 `NODE_ENV=production`
3. 檢查檔案寫入權限

### 日誌過多
1. 調整 `LOG_LEVEL` 環境變數
2. 檢討 debug 等級的使用
3. 設定更嚴格的 Morgan 格式

### 效能問題
1. 確認生產環境使用 JSON 格式 (不要用 Console 彩色格式)
2. 考慮使用非同步日誌寫入
3. 實作日誌取樣 (高流量情況下)
