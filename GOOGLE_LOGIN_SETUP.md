# Google 快速登入設置指南

##  功能說明

已為平台整合 Google One Tap 快速登入功能，使用者可以使用 Google 帳號快速登入，無需記憶額外的密碼。

##  設置步驟

### 1. 取得 Google OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google+ API** 或 **Google Identity Services**
4. 前往「憑證」頁面
5. 建立「OAuth 2.0 用戶端 ID」
   - 應用程式類型：**網頁應用程式**
   - 名稱：任意名稱（例如：寵物認養平台）
6. 設定授權的 JavaScript 來源：
   - 開發環境：http://localhost:3000
   - 生產環境：https://yourdomain.com
7. 設定授權的重定向 URI：
   - 開發環境：http://localhost:5000/api/auth/google/callback
   - 生產環境：https://yourdomain.com/api/auth/google/callback
8. 儲存並複製 **用戶端 ID** 和 **用戶端密鑰**

### 2. 設定後端環境變數

編輯 ackend/.env 檔案：

\\\env
# Google OAuth
GOOGLE_CLIENT_ID=你的-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT Secret (如果還沒設定)
JWT_SECRET=你的-jwt-密鑰
SESSION_SECRET=你的-session-密鑰

# Frontend URL
FRONTEND_URL=http://localhost:3000
\\\

### 3. 設定前端環境變數

編輯 rontend/.env 檔案：

\\\env
# Google OAuth Client ID
REACT_APP_GOOGLE_CLIENT_ID=你的-client-id.apps.googleusercontent.com
\\\

### 4. 安裝依賴（如果需要）

後端已經包含所需的套件，但如果需要重新安裝：

\\\ash
cd backend
npm install google-auth-library
\\\

### 5. 重啟服務

\\\ash
# 停止現有服務
# 然後重新啟動

# 後端
cd backend
npm start

# 前端
cd frontend
npm start
\\\

##  使用方式

### 使用者端

1. 訪問登入頁面 /login
2. 點擊「使用 Google 帳號登入」按鈕
3. 選擇 Google 帳號並授權
4. 自動登入並重定向到儀表板

### 開發者端

系統提供兩種 Google 登入方式：

#### 1. Google One Tap (推薦)

前端使用 GoogleLoginButton 組件：

\\\jsx
import GoogleLoginButton from '../components/GoogleLoginButton';

<GoogleLoginButton
  onSuccess={(result) => {
    // 登入成功處理
    console.log('登入成功', result);
  }}
  onError={(error) => {
    // 錯誤處理
    console.error('登入失敗', error);
  }}
/>
\\\

#### 2. 傳統 OAuth Flow

直接重定向到後端端點：

\\\javascript
window.location.href = 'http://localhost:5000/api/auth/google';
\\\

##  API 端點

### POST /api/auth/google/verify

驗證 Google One Tap Token

**請求：**
\\\json
{
  "token": "google_id_token"
}
\\\

**回應：**
\\\json
{
  "message": "Google login successful",
  "token": "jwt_token",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar_url": "https://...",
    "role": "user"
  }
}
\\\

### GET /api/auth/google

啟動 Google OAuth 登入流程（重定向方式）

### GET /api/auth/google/callback

處理 Google OAuth 回呼

##  測試方式

### 1. 測試配置

\\\ash
cd backend
node test-oauth-config.js
\\\

這會檢查所有環境變數是否正確設定。

### 2. 測試登入流程

1. 開啟瀏覽器到 http://localhost:3000/login
2. 點擊 Google 登入按鈕
3. 選擇測試帳號
4. 確認授權
5. 應該自動登入並重定向到 dashboard

### 3. 檢查資料庫

登入後，檢查 MongoDB 中的 users 集合：

\\\javascript
db.users.find({ authProvider: 'google' })
\\\

應該看到新建立的使用者，包含：
- googleId: Google 使用者 ID
- uthProvider: "google"
- isEmailVerified: true
- vatar_url: Google 頭像 URL

##  安全性說明

1. **Token 驗證**：使用 google-auth-library 驗證 Google Token 的真實性
2. **Email 驗證**：只接受已驗證的 Google 帳號
3. **JWT Token**：登入成功後發放 JWT Token，有效期 7 天
4. **自動綁定**：如果 email 已存在，自動綁定 Google 帳號

##  常見問題

### 1. 按鈕無法顯示

**原因**：Google Identity Services 腳本未載入

**解決**：
- 確認 rontend/public/index.html 包含 Google 腳本
- 檢查瀏覽器控制台是否有載入錯誤
- 確認網路連線正常

### 2. 401 Unauthorized

**原因**：Client ID 不正確或未設定

**解決**：
- 檢查 rontend/.env 中的 REACT_APP_GOOGLE_CLIENT_ID
- 確認 Google Cloud Console 中的 Client ID 正確
- 重啟前端服務

### 3. Redirect URI mismatch

**原因**：回呼 URI 與 Google Cloud Console 設定不符

**解決**：
- 檢查 ackend/.env 中的 GOOGLE_CALLBACK_URL
- 確認 Google Cloud Console 中的授權重定向 URI 包含該 URL
- 注意 http/https 和埠號必須完全一致

### 4. Invalid token

**原因**：Client Secret 錯誤或 Token 過期

**解決**：
- 檢查 ackend/.env 中的 GOOGLE_CLIENT_SECRET
- 確認時間同步正確
- 重新嘗試登入

##  更多資訊

- [Google Identity Services 文件](https://developers.google.com/identity/gsi/web/guides/overview)
- [OAuth 2.0 說明](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In JavaScript API](https://developers.google.com/identity/sign-in/web/reference)

##  完成

設定完成後，使用者即可使用 Google 帳號快速登入平台！
