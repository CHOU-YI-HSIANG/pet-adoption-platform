# 🐾 愛心動物認養平台

一個完整的動物認養平台，提供寵物資訊瀏覽、認養申請、使用者管理等功能。

## ✨ 主要功能

### 👤 使用者系統
- 用戶註冊與登入
- 個人資料管理
- JWT 身分驗證

### 🐕 寵物管理
- 寵物資訊瀏覽
- 寵物圖片展示
- 多條件搜尋與篩選
- 寵物詳細資料頁

### 📝 認養申請
- 在線認養申請
- 申請狀態追蹤
- 申請記錄管理

### 🎨 使用者界面
- 響應式設計
- Tailwind CSS 樣式
- 現代化 UI/UX
- 無障礙設計支援

## �️ 技術架構

### 後端技術
- **Node.js** + **Express.js** - 後端框架
- **MongoDB** + **Mongoose** - 資料庫
- **JWT** - 身分認證
- **bcryptjs** - 密碼加密
- **Multer** - 檔案上傳
- **Express-rate-limit** - API 限流

### 前端技術
- **React 18** - 前端框架
- **React Router** - 路由管理
- **React Query** - 資料狀態管理
- **React Hook Form** - 表單處理
- **Tailwind CSS** - UI 樣式
- **Lucide React** - 圖標庫
- **React Hot Toast** - 通知提示

## 🚀 快速開始

### 系統需求
- Node.js 16+
- MongoDB 4.4+
- npm 或 yarn

### 一鍵啟動 (推薦)
```bash
# Windows 使用者
雙擊 start.bat 檔案

# 或在命令列執行
start.bat
```

### 手動啟動
```bash
# 1. 安裝後端依賴
cd backend
npm install

# 2. 設定環境變數
copy .env.example .env
# 編輯 .env 檔案設定資料庫連線

# 3. 啟動後端 (Port: 5000)
npm run dev

# 4. 安裝前端依賴 (新終端)
cd ../frontend
npm install

# 5. 啟動前端 (Port: 3000)
npm start
```

### 瀏覽應用
- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:5000

## 📁 專案結構

```
pet-adoption-platform/
├── backend/                 # 後端應用
│   ├── models/             # 資料模型
│   │   ├── User.js        # 使用者模型
│   │   ├── Pet.js         # 寵物模型
│   │   └── Adoption.js    # 認養申請模型
│   ├── routes/             # API 路由
│   │   ├── auth.js        # 認證相關
│   │   ├── users.js       # 使用者管理
│   │   ├── pets.js        # 寵物管理
│   │   └── adoptions.js   # 認養申請
│   ├── .env.example       # 環境變數範例
│   ├── package.json       # 後端依賴
│   └── server.js          # 主伺服器檔案
├── frontend/               # 前端應用
│   ├── src/
│   │   ├── components/    # React 元件
│   │   ├── pages/         # 頁面元件
│   │   ├── services/      # API 服務
│   │   ├── App.js         # 主應用元件
│   │   └── index.css      # 樣式檔案
│   ├── public/            # 靜態檔案
│   ├── package.json       # 前端依賴
│   ├── tailwind.config.js # Tailwind 配置
│   └── postcss.config.js  # PostCSS 配置
├── start.bat              # 一鍵啟動腳本
├── fix-frontend.bat       # 前端修復腳本
├── STARTUP_GUIDE.md       # 詳細啟動指南
└── README.md              # 專案說明
```

## 🎯 API 端點

### 認證相關
- `POST /api/auth/register` - 使用者註冊
- `POST /api/auth/login` - 使用者登入

### 寵物相關
- `GET /api/pets` - 獲取寵物列表
- `GET /api/pets/:id` - 獲取單一寵物詳情
- `POST /api/pets` - 新增寵物 (需認證)

### 認養申請
- `GET /api/adoptions` - 獲取申請列表
- `POST /api/adoptions` - 提交認養申請
- `PUT /api/adoptions/:id` - 更新申請狀態

### 使用者管理
- `GET /api/users/me` - 獲取個人資料
- `PUT /api/users/me` - 更新個人資料

## 🧪 環境配置

### 後端環境變數 (.env)
```env
# 基本設定
NODE_ENV=development
PORT=5000

# 資料庫設定
MONGODB_URI=mongodb://localhost:27017/pet_adoption

# JWT 設定
JWT_SECRET=your_super_secret_jwt_key_here

# 檔案上傳設定
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# CORS 設定
FRONTEND_URL=http://localhost:3000
```

## 🧾 後端：環境變數與測試（建議）

將 `backend/.env.example` 複製為 `backend/.env` 並填入實際值。建議在本地與 CI 設定下列變數，以確保整合測試穩定：

- `DB_CONNECT_MAX_RETRIES`：資料庫連線最大重試次數（CI 建議 10~60）。
- `DB_CONNECT_DELAY_MS`：初始重試延遲（毫秒），之後採指數退避（CI 建議 1000~2000）。
- `READINESS_RETRIES`：整合測試等待 `/api/ready` 的重試次數（CI 建議 60）。
- `READINESS_DELAY_MS`：等待間隔（毫秒）（CI 建議 2000）。

範例（PowerShell） — 在同一個 terminal 設定環境變數並執行：
```powershell
cd "backend"
# 設定範例（只在當前 shell 有效）
$env:DB_CONNECT_MAX_RETRIES = "60"
$env:DB_CONNECT_DELAY_MS = "2000"
$env:READINESS_RETRIES = "60"
$env:READINESS_DELAY_MS = "2000"

# 啟動後端
npm run dev

# 於另一個 terminal 執行整合測試
node test-integration.js
```

提示：在 CI pipeline 中，請以 job-level env variables 設定這些值，並在執行測試前確保 `http://localhost:5000/api/ready` 回應 200（或讓測試腳本等待）。

## �️ 問題排除

### Tailwind CSS 錯誤
如果遇到 CSS 編譯問題：
```bash
# 執行修復腳本
fix-frontend.bat

# 或手動修復
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 資料庫連線問題
確保 MongoDB 服務正在運行：
```bash
# Windows
net start MongoDB

# 或直接啟動
mongod
```

### 埠號衝突
如果埠號被佔用，可以修改：
- 後端：修改 `backend/.env` 中的 `PORT`
- 前端：React 會自動提示選擇其他埠號

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📝 授權

此專案使用 MIT 授權 - 詳見 LICENSE 檔案

## � 致謝

感謝所有為動物認養平台開發貢獻力量的開發者和支持者！

---

**讓我們一起為可愛的毛孩子們找到溫暖的家！** 🏠❤️