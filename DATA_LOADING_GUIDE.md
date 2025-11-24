#  寵物資料載入指南

## 方法一:使用種子腳本 (推薦)

### 步驟 1:確保 MongoDB 正在運行

**選項 A - 安裝本地 MongoDB**
1. 下載 MongoDB Community Server: https://www.mongodb.com/try/download/community
2. 安裝後啟動 MongoDB 服務

**選項 B - 使用 MongoDB Atlas (雲端,免費)**
1. 註冊 MongoDB Atlas: https://www.mongodb.com/cloud/atlas/register
2. 建立免費叢集 (M0 Sandbox)
3. 取得連接字串
4. 在 \ackend/.env\ 設定: \MONGODB_URI=你的連接字串\

### 步驟 2:執行種子腳本

\\\powershell
# 進入 backend 目錄
cd pet-adoption-platform/backend

# 載入示範資料
node seed.js

# 或者,清除舊資料後載入
node seed.js --clear
\\\

### 步驟 3:查看結果

執行成功後,您會看到:
-  8 隻寵物資料 (5隻狗 + 3隻貓)
-  1 個收容所帳號: \shelter@example.com\ / \shelter123\

---

## 方法二:透過 API 手動新增

### 1. 建立收容所帳號

\\\powershell
# 使用 PowerShell
\ = @{
    name = '愛心動物之家'
    email = 'shelter@example.com'
    password = 'shelter123'
    role = 'shelter'
    phone = '02-12345678'
    address = '台北市信義區'
    shelterInfo = @{
        shelterName = '愛心動物之家'
        licenseNumber = 'SH-2024-001'
        address = '台北市信義區信義路五段100號'
        phone = '02-12345678'
        capacity = 50
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/register' -Method Post -Body \ -ContentType 'application/json'
\\\

### 2. 登入取得 Token

\\\powershell
\ = @{
    email = 'shelter@example.com'
    password = 'shelter123'
} | ConvertTo-Json

\{"status":"OK","message":"?????????????????? API ?????????","timestamp":"2025-11-09T15:49:11.482Z","features":{"database":"disconnected","socketIO":"enabled","uploads":"enabled","security":"helmet + rate-limiting"}} = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -Body \ -ContentType 'application/json'
\ = \{"status":"OK","message":"?????????????????? API ?????????","timestamp":"2025-11-09T15:49:11.482Z","features":{"database":"disconnected","socketIO":"enabled","uploads":"enabled","security":"helmet + rate-limiting"}}.token
\\\

### 3. 新增寵物資料

\\\powershell
\ = @{
    name = '小白'
    species = '狗'
    breed = '拉布拉多'
    age = 2
    gender = '公'
    size = '大型'
    color = '白色'
    healthStatus = '健康'
    vaccinated = \True
    neutered = \True
    personality = @('友善', '活潑', '親人')
    description = '非常親人的拉布拉多,喜歡玩耍和游泳'
    location = '台北市'
    images = @('https://images.unsplash.com/photo-1552053831-71594a27632d?w=400')
    status = '可認養'
    shelterRequirements = @{
        hasExperience = \False
        hasYard = \True
        acceptsOtherPets = \True
    }
} | ConvertTo-Json -Depth 3

\ = @{
    'Authorization' = \"Bearer \\"
    'Content-Type' = 'application/json'
}

Invoke-RestMethod -Uri 'http://localhost:5000/api/pets' -Method Post -Body \ -Headers \
\\\

---

## 方法三:使用 Swagger UI (圖形化介面)

1. 開啟瀏覽器前往: http://localhost:5000/api-docs
2. 點擊 \POST /api/auth/register\ 註冊收容所帳號
3. 點擊 \POST /api/auth/login\ 登入取得 token
4. 點擊右上角 \Authorize\ 按鈕,輸入: \Bearer 你的token\
5. 使用 \POST /api/pets\ 新增寵物資料

---

##  測試帳號

執行 seed.js 後,您可以使用以下測試帳號:

**收容所帳號:**
- 帳號: \shelter@example.com\
- 密碼: \shelter123\
- 用途: 管理寵物、查看認養申請

**一般用戶:**
- 需要自行註冊: http://localhost:3000/register
- 或使用 Google 快速登入

---

##  查看資料

### 透過前端:
- 寵物列表: http://localhost:3000/pets
- 首頁: http://localhost:3000

### 透過 API:
\\\powershell
# 取得所有寵物
Invoke-RestMethod -Uri 'http://localhost:5000/api/pets'

# 取得特定寵物
Invoke-RestMethod -Uri 'http://localhost:5000/api/pets/寵物ID'
\\\

### 透過 Swagger:
- http://localhost:5000/api-docs
- 測試 \GET /api/pets\ 端點

---

##  常見問題

**Q: MongoDB 連接失敗怎麼辦?**
A: 
1. 確認 MongoDB 服務正在運行
2. 檢查 \.env\ 的 \MONGODB_URI\ 設定
3. 或使用 MongoDB Atlas 雲端服務

**Q: 載入資料後前端看不到?**
A:
1. 確認後端伺服器正在運行 (port 5000)
2. 確認前端伺服器正在運行 (port 3000)
3. 重新整理瀏覽器
4. 檢查瀏覽器 Console 是否有錯誤

**Q: 需要清除資料重新載入?**
A: 執行 \
ode seed.js --clear\ 會先刪除所有寵物後再載入

**Q: 圖片顯示不出來?**
A: 目前使用 Unsplash 的公開圖片連結,需要網路連接。您也可以上傳自己的圖片到 \ackend/uploads/pets\ 目錄。

---

##  快速開始流程

\\\powershell
# 1. 啟動 MongoDB (如果使用本地)
# (Windows: 服務管理員啟動 MongoDB)

# 2. 啟動後端
cd pet-adoption-platform/backend
npm run dev

# 3. 載入測試資料 (新視窗)
cd pet-adoption-platform/backend
node seed.js

# 4. 啟動前端 (新視窗)
cd pet-adoption-platform/frontend
npm start

# 5. 開啟瀏覽器
# http://localhost:3000
\\\

現在您可以:
- 瀏覽寵物列表
- 註冊一般用戶帳號
- 測試認養功能
- 使用收容所帳號管理寵物
