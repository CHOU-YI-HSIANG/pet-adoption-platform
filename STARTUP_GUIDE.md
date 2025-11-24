# 🐾 愛心動物認養平台 - 快速啟動指南

## 📋 系統需求
- Node.js 16+ 
- MongoDB 4.4+
- npm 或 yarn

## 🚀 一鍵啟動 (Windows)
直接雙擊 `start.bat` 檔案即可自動安裝並啟動整個平台！

## 📖 手動啟動步驟

### 1. 安裝後端依賴
```bash
cd backend
npm install
```

### 2. 設定環境變數
```bash
# 複製環境設定檔
copy .env.example .env

# 編輯 .env 檔案，確認 MongoDB 連線設定
```

### 3. 啟動 MongoDB
確保 MongoDB 服務正在運行，或執行：
```bash
mongod
```

### 4. 啟動後端伺服器
```bash
cd backend
npm run dev
# 後端將在 http://localhost:5000 啟動
```

### 5. 安裝前端依賴並啟動
開啟新的命令視窗：
```bash
cd frontend
npm install
npm start
# 前端將在 http://localhost:3000 啟動
```

## 🌐 存取應用程式
- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:5000

## 📱 主要功能
- 🔐 使用者註冊/登入
- 🐕 瀏覽寵物資訊
- 📝 提交認養申請
- 👤 個人資料管理
- 📊 申請狀態追蹤

## 🛠️ 常見問題

### Q: 前端無法啟動，出現 Tailwind CSS 錯誤
A: ✅ **已修復！** Tailwind CSS 配置已更新並測試通過。如仍有問題，可執行 `fix-frontend.bat`

### Q: 無法連接資料庫
A: 檢查 MongoDB 是否運行，並確認 `.env` 中的 `MONGODB_URI` 設定正確：
```
MONGODB_URI=mongodb://localhost:27017/pet_adoption
```

### Q: API 請求失敗
A: 確認後端伺服器已啟動，並檢查防火牆設定

### Q: PowerShell 執行策略錯誤
A: 可以改用 cmd 或執行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## � 問題排除工具

### 修復前端問題
如果前端出現任何問題，可執行：
```bash
fix-frontend.bat
```
此腳本會：
- 清除 node_modules 和快取
- 重新安裝依賴
- 檢查 Tailwind CSS 配置
- 測試編譯流程

### 檢查配置
- **PostCSS 配置**: `frontend/postcss.config.js`
- **Tailwind 配置**: `frontend/tailwind.config.js`
- **環境變數**: `backend/.env`

## �📞 技術支援
如遇到問題，請檢查：
1. ✅ Node.js 版本是否正確
2. ✅ MongoDB 服務是否運行
3. ✅ 埠號 3000 和 5000 是否被佔用
4. ✅ Tailwind CSS 配置是否正確
5. ✅ 網路防火牆設定

## 🎉 成功啟動指標
- 後端：在瀏覽器訪問 `http://localhost:5000/api/pets` 應該返回 JSON 資料
- 前端：在瀏覽器訪問 `http://localhost:3000` 應該看到動物認養平台首頁

**恭喜！您的愛心動物認養平台已經準備就緒！** 🎊