#  Google Cloud Console 詳細設定步驟

##  當前問題

錯誤代碼：**401 invalid_client**
原因：Google Cloud Console 中的 OAuth 用戶端設定有問題

##  完整設定步驟（請依序執行）

### 第 1 步：訪問 Google Cloud Console

1. 打開瀏覽器
2. 訪問：https://console.cloud.google.com/
3. 使用您的 Google 帳號登入

### 第 2 步：建立或選擇專案

**如果還沒有專案：**
1. 點擊頂部的專案選擇器
2. 點擊「新增專案」
3. 輸入專案名稱：pet-adoption-platform
4. 點擊「建立」

**如果已有專案：**
- 從專案選擇器中選擇您的專案

### 第 3 步：啟用必要的 API

1. 在左側選單找到「API 和服務」「資料庫」
2. 點擊「+ 啟用 API 和服務」
3. 搜尋並啟用以下 API：
   - **Google+ API** 或 **Google Identity Services API**
   - 點擊「啟用」按鈕

### 第 4 步：配置 OAuth 同意畫面（重要！）

1. 在左側選單點擊「OAuth 同意畫面」

2. **選擇使用者類型**：
   - 選擇「外部」（推薦用於測試）
   - 點擊「建立」

3. **填寫應用程式資訊**（第 1 頁）：
   `
   應用程式名稱：寵物認養平台
   使用者支援電子郵件：[選擇您的 email]
   應用程式標誌：[可選，可跳過]
   應用程式首頁：http://localhost:3000
   應用程式隱私權政策連結：[可暫時留空]
   應用程式服務條款連結：[可暫時留空]
   已授權網域：[暫時留空]
   開發人員聯絡資訊：[輸入您的 email]
   `
   - 點擊「儲存並繼續」

4. **範圍設定**（第 2 頁）：
   - 直接點擊「儲存並繼續」（保持預設）

5. **測試使用者**（第 3 頁）：
   - 點擊「+ 新增使用者」
   - 輸入您要測試的 Google 帳號 email
   - 點擊「新增」
   - 點擊「儲存並繼續」

6. **摘要**（第 4 頁）：
   - 檢查設定
   - 點擊「返回資訊主頁」

### 第 5 步：建立 OAuth 2.0 用戶端 ID

1. 在左側選單點擊「憑證」

2. 點擊頂部的「+ 建立憑證」「OAuth 用戶端 ID」

3. **應用程式類型**：
   - 選擇「網頁應用程式」

4. **名稱**：
   - 輸入：寵物認養平台 - 開發環境

5. **授權的 JavaScript 來源**：
   - 點擊「+ 新增 URI」
   - 第 1 個 URI：http://localhost:3000
   - 點擊「+ 新增 URI」
   - 第 2 個 URI：http://localhost:5000

6. **授權的重新導向 URI**：
   - 點擊「+ 新增 URI」
   - 第 1 個 URI：http://localhost:5000/api/auth/google/callback
   - 點擊「+ 新增 URI」
   - 第 2 個 URI：http://localhost:3000/auth/callback

7. 點擊「建立」

8. **重要！複製憑證**：
   - 會彈出包含「用戶端 ID」和「用戶端密鑰」的視窗
   - **立即複製這些資訊**，或點擊下載 JSON

### 第 6 步：更新您的 .env 檔案

**後端** (\ackend/.env\)：
`env
GOOGLE_CLIENT_ID=剛才複製的用戶端ID
GOOGLE_CLIENT_SECRET=剛才複製的用戶端密鑰
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
`

**前端** (\rontend/.env\)：
`env
REACT_APP_GOOGLE_CLIENT_ID=剛才複製的用戶端ID
`

### 第 7 步：等待生效

 **重要**：新建立的 OAuth 憑證需要 **5-10 分鐘**才會生效
- 請耐心等待
- 可以先去喝杯咖啡 

### 第 8 步：重啟服務

`powershell
# 停止所有正在運行的服務 (Ctrl+C)

# 重新啟動後端
cd backend
npm start

# 在新的 PowerShell 視窗啟動前端
cd frontend
npm start
`

### 第 9 步：測試登入

1. 清除瀏覽器快取（重要！）
   - Chrome：Ctrl + Shift + Delete
   - 選擇「快取的圖片和檔案」
   - 點擊「清除資料」

2. 訪問 http://localhost:3000/login

3. 點擊「使用 Google 帳號登入」按鈕

4. 應該會看到 Google 登入頁面（而不是錯誤）

##  成功指標

登入成功後，您應該：
1. 看到 Google 帳號選擇畫面
2. 選擇帳號後自動登入
3. 重定向回平台的 Dashboard
4. 看到您的 Google 頭像和名稱

##  常見檢查點

### 檢查 1：確認 OAuth 同意畫面狀態
- 狀態應該是「測試中」或「已發布」
- 如果是「測試中」，確保您的測試帳號已加入測試使用者清單

### 檢查 2：確認憑證狀態
- 在「憑證」頁面，您的 OAuth 用戶端 ID 應該顯示為「啟用」
- 如果顯示為「已停用」，點擊編輯並重新啟用

### 檢查 3：URL 完全一致
`
Google Console 設定：http://localhost:5000/api/auth/google/callback
.env 檔案設定：     http://localhost:5000/api/auth/google/callback
                     必須完全一樣，包括 http:// 和斜線
`

##  仍然出現 401 錯誤？

### 選項 A：刪除並重建憑證
1. 在 Google Cloud Console 的「憑證」頁面
2. 找到您的 OAuth 用戶端 ID
3. 點擊右側的垃圾桶圖示刪除
4. 等待 5 分鐘
5. 重新執行「第 5 步」建立新的憑證

### 選項 B：檢查專案是否正確
- 確認您在正確的 Google Cloud 專案中
- 專案選擇器（頂部）顯示的專案名稱應該是您剛才設定的

### 選項 C：使用不同的 Google 帳號
- 某些企業或學校的 Google 帳號可能有限制
- 嘗試使用個人 Gmail 帳號

##  需要視覺化指南？

參考這些官方截圖教學：
- [OAuth 用戶端 ID 設定](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)
- [OAuth 同意畫面設定](https://support.google.com/cloud/answer/10311615)

##  小提示

1. **開發階段**使用「外部」+ 「測試模式」最方便
2. **測試使用者**只有在測試模式下才需要設定
3. **生產環境**記得切換到「已發布」狀態
4. 憑證資訊請**妥善保管**，不要上傳到 Git

---

完成以上步驟後，Google 登入功能應該就能正常運作了！
