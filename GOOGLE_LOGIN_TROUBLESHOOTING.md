# Google OAuth 401 錯誤排除指南

##  錯誤訊息
\\\
已封鎖存取權：授權錯誤
The OAuth client was not found.
發生錯誤 401： invalid_client
\\\

##  錯誤原因

這個錯誤通常是以下原因之一：

1. **Client ID 或 Client Secret 不正確**
2. **OAuth 用戶端已被刪除或禁用**
3. **專案設定未完成**
4. **憑證尚未生效（需要幾分鐘）**

##  解決步驟

### 步驟 1：確認 Google Cloud Console 設定

1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)

2. 選擇您的專案（或建立新專案）

3. 前往 **API 和服務 > 憑證**

4. 檢查是否有 OAuth 2.0 用戶端 ID
   - 如果沒有，點擊「建立憑證」「OAuth 用戶端 ID」
   - 如果有但顯示已停用，需要重新啟用

### 步驟 2：建立或更新 OAuth 2.0 用戶端 ID

#### A. 選擇應用程式類型
- 選擇：**網頁應用程式**
- 名稱：任意名稱（例如：寵物認養平台）

#### B. 設定授權的 JavaScript 來源
點擊「新增 URI」並加入：
\\\
http://localhost:3000
http://localhost:5000
\\\

#### C. 設定授權的重新導向 URI
點擊「新增 URI」並加入：
\\\
http://localhost:5000/api/auth/google/callback
http://localhost:3000/auth/callback
\\\

#### D. 儲存並複製憑證
- 點擊「建立」
- **重要**：複製「用戶端 ID」和「用戶端密鑰」

### 步驟 3：更新環境變數

#### 後端 (\ackend/.env\)
\\\env
# 替換為您剛才複製的憑證
GOOGLE_CLIENT_ID=您的-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-您的-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
\\\

#### 前端 (\rontend/.env\)
\\\env
# 使用相同的 Client ID
REACT_APP_GOOGLE_CLIENT_ID=您的-client-id.apps.googleusercontent.com
\\\

### 步驟 4：啟用必要的 API

在 Google Cloud Console 中：

1. 前往 **API 和服務 > 資料庫**
2. 搜尋並啟用以下 API：
   - **Google+ API** (或)
   - **Google Identity Toolkit API**
   - **Google People API** (可選)

### 步驟 5：配置 OAuth 同意畫面

1. 前往 **API 和服務 > OAuth 同意畫面**
2. 選擇使用者類型：
   - **外部**：任何人都可以使用（測試時推薦）
   - **內部**：僅限組織內部
3. 填寫必要資訊：
   - 應用程式名稱：寵物認養平台
   - 使用者支援電子郵件：您的 email
   - 開發人員聯絡資訊：您的 email
4. 點擊「儲存並繼續」
5. 範圍設定：保持預設即可
6. 測試使用者：
   - 如果選擇「外部」且在測試模式，需要新增測試使用者
   - 新增您要測試的 Google 帳號 email

### 步驟 6：重啟服務

\\\ash
# 1. 停止所有正在運行的服務 (Ctrl+C)

# 2. 重新啟動後端
cd backend
npm start

# 3. 在新終端機重新啟動前端
cd frontend
npm start
\\\

### 步驟 7：測試

1. 清除瀏覽器快取和 cookies
2. 訪問 http://localhost:3000/login
3. 點擊 Google 登入按鈕
4. 應該會看到 Google 登入畫面

##  進階故障排除

### 檢查 1：驗證憑證是否正確載入

\\\ash
cd backend
node test-oauth-config.js
\\\

應該顯示：
\\\
 GOOGLE_CLIENT_ID: OK
 GOOGLE_CLIENT_SECRET: OK
 GOOGLE_CALLBACK_URL: OK
\\\

### 檢查 2：測試後端端點

在瀏覽器訪問：
\\\
http://localhost:5000/api/auth/google
\\\

如果設定正確，應該會重定向到 Google 登入頁面。
如果出現錯誤，檢查瀏覽器控制台和後端終端的錯誤訊息。

### 檢查 3：查看詳細錯誤

打開瀏覽器開發者工具（F12）：
- **Console** 標籤：查看 JavaScript 錯誤
- **Network** 標籤：查看 API 請求和回應

### 檢查 4：確認 URL 完全一致

Google Cloud Console 中的重定向 URI 必須**完全一致**：
- 包含 http:// 或 https://
- 埠號必須一致
- 路徑必須一致
- 不能有多餘的斜線

##  快速檢查清單

- [ ] Google Cloud 專案已建立
- [ ] OAuth 2.0 用戶端 ID 已建立
- [ ] 授權的 JavaScript 來源已設定
- [ ] 授權的重定向 URI 已設定
- [ ] OAuth 同意畫面已配置
- [ ] 測試使用者已新增（如果是外部測試模式）
- [ ] 必要的 API 已啟用
- [ ] Client ID 和 Secret 已複製到 .env
- [ ] 後端服務已重啟
- [ ] 前端服務已重啟

##  仍然無法解決？

### 選項 1：使用測試憑證

您可以暫時使用 Google 提供的測試憑證來確認功能是否正常。

### 選項 2：檢查專案配額

前往 Google Cloud Console > IAM 與管理 > 配額
確認 OAuth 2.0 用戶端沒有達到配額上限。

### 選項 3：重新建立憑證

1. 刪除現有的 OAuth 用戶端 ID
2. 等待 5 分鐘
3. 重新建立新的 OAuth 用戶端 ID
4. 使用新的憑證更新 .env 檔案

##  需要更多幫助？

參考 Google 官方文件：
- [設定 OAuth 2.0](https://support.google.com/cloud/answer/6158849)
- [OAuth 2.0 錯誤代碼](https://developers.google.com/identity/protocols/oauth2/web-server#error-codes)

---

**提示**：新建立的 OAuth 憑證可能需要 5-10 分鐘才會生效，請耐心等待。
