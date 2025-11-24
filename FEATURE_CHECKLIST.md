#  PRD 功能實作對照表

##  已完成功能

### 1.0 使用者個人資料
| 功能編號 | 功能名稱 | 實作狀態 | 前端頁面 | 後端 API |
|---------|---------|---------|---------|---------|
| 1.1.1 | Google 帳號快速註冊/登入 |  | LoginPage.js | /api/auth/google |
| 1.2 | 個人使用者資料填寫 |  | RegisterPage.js, ProfilePage.js | /api/users/profile |
| 1.3.1 | 機構使用者資料自動帶入 |  | RegisterPage.js | /api/auth/register |
| 1.4 | 個人資料編輯 |  | ProfilePage.js | /api/users/profile |

**使用方式:**
- 前往 http://localhost:3000/register 註冊
- 前往 http://localhost:3000/login 登入
- 前往 http://localhost:3000/profile 編輯個人資料

---

### 2.0 寵物資料
| 功能編號 | 功能名稱 | 實作狀態 | 前端頁面 | 後端 API |
|---------|---------|---------|---------|---------|
| 2.1.1 | 顯示寵物縮圖與名稱 |  | PetsPage.js, HomePage.js | /api/pets |
| 2.1.2 | 顯示寵物詳細資訊 |  | PetDetailPage.js | /api/pets/:id |
| 2.1.3 | 顯示送養者設定認養需求 |  | PetDetailPage.js | /api/pets/:id |
| 2.1.4 | 機構寵物連接到機構資料 |  | PetDetailPage.js | /api/pets/:id (populate shelter) |
| 2.2.1 | 寵物搜尋與篩選 |  | PetsPage.js | /api/pets (with query params) |
| 2.3.1 | 寵物資料新增/修改/刪除 |  | ShelterDashboardPage.js, PetEditPage.js | /api/pets |
| 2.4.1 | 已認養寵物自動標記 |  | 後端自動處理 | /api/adoptions/:id/status |
| 2.5.1 | 寵物排序 |  | PetsPage.js | /api/pets?sort=... |

**使用方式:**
- 瀏覽寵物: http://localhost:3000/pets
- 寵物詳情: http://localhost:3000/pets/:id
- 收容所管理寵物: http://localhost:3000/shelter/dashboard (需登入收容所帳號)

---

### 3.0 認養申請
| 功能編號 | 功能名稱 | 實作狀態 | 前端頁面 | 後端 API |
|---------|---------|---------|---------|---------|
| 3.1 | 私訊媒合功能 |  | MessagesPage.js, ConversationPage.js | /api/messages |
| 3.2 | 認養者填寫資料 |  | AdoptionApplicationPage.js | /api/adoptions |
| 3.3 | 認養狀態更新 |  | MyApplicationsPage.js | /api/adoptions/:id/status |
| 3.4 | 機構認養審核 |  | ShelterDashboardPage.js | /api/adoptions/admin |

**使用方式:**
- 申請認養: 點選寵物詳情頁的「申請認養」按鈕
- 查看申請: http://localhost:3000/my-applications (需登入)
- 私訊送養者: 點選「聯絡送養者」按鈕
- 機構審核: http://localhost:3000/shelter/dashboard (需登入收容所帳號)

---

### 額外功能 (超出 PRD)
| 功能名稱 | 實作狀態 | 前端頁面 | 後端 API |
|---------|---------|---------|---------|
| 社群討論區 |  | CommunityPage.js, PostDetailPage.js | /api/posts, /api/comments |
| 走失寵物專區 |  | LostPetsPage.js | /api/posts?type=lost |
| 即時通知系統 |  | NotificationsPage.js | /api/notifications |
| 寵物推薦系統 |  | HomePage.js | /api/recommendations |
| 使用者儀表板 |  | UserDashboardPage.js | /api/users/dashboard |
| **寵物贊助功能** (Epic 3) |  | PetDetailPage.js, ShelterDashboardPage.js | /api/pets/:id/sponsor-click |
| API 文件 (Swagger) |  | N/A | /api-docs |

---

##  功能存取說明

### 公開功能 (無需登入)
-  首頁瀏覽
-  寵物列表
-  寵物詳情
-  社群文章瀏覽
-  走失寵物資訊
-  註冊/登入

### 需登入功能 (一般用戶)
-  申請認養
-  我的認養申請
-  私訊功能
-  發表文章/評論
-  個人資料編輯
-  使用者儀表板
-  通知系統

### 需登入功能 (收容所帳號)
-  新增/編輯/刪除寵物
-  查看認養申請
-  審核認養申請
-  收容所儀表板
-  查看贊助統計

---

##  測試帳號

### 收容所帳號 (執行 seed.js 後自動建立)
- **帳號**: shelter@example.com
- **密碼**: shelter123
- **權限**: 管理寵物、審核認養申請

### 一般用戶帳號
- **需自行註冊**: http://localhost:3000/register
- **或使用 Google 登入**

---

##  功能測試流程

### 測試流程 1: 一般用戶認養寵物
1. 註冊/登入一般用戶帳號
2. 瀏覽寵物列表: http://localhost:3000/pets
3. 點選喜歡的寵物查看詳情
4. 點擊「申請認養」填寫申請表
5. 前往「我的認養申請」查看狀態
6. 使用私訊功能聯絡送養者

### 測試流程 2: 收容所管理寵物
1. 使用收容所帳號登入 (shelter@example.com / shelter123)
2. 前往收容所儀表板: http://localhost:3000/shelter/dashboard
3. 新增寵物資料
4. 查看認養申請列表
5. 審核認養申請 (通過/拒絕)
6. 編輯寵物資訊

### 測試流程 3: 社群互動
1. 登入任何帳號
2. 前往社群討論區: http://localhost:3000/community
3. 發表新文章或走失寵物資訊
4. 對文章按讚、評論
5. 查看通知: http://localhost:3000/notifications

---

##  常見問題

**Q: 為什麼前端看不到某些功能?**
A: 某些功能需要登入後才能看到,請先註冊或登入帳號。

**Q: 寵物列表是空的?**
A: 需要先載入測試資料:
   \\\powershell
   cd pet-adoption-platform/backend
   node seed.js
   \\\

**Q: 如何測試收容所功能?**
A: 使用測試帳號登入:
   - 帳號: shelter@example.com
   - 密碼: shelter123

**Q: Google 登入功能如何測試?**
A: 需要先在 Google Cloud Console 設定 OAuth 2.0 憑證,並在 backend/.env 設定 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET。

**Q: 哪些 PRD 功能還沒實作?**
A: 目前 PRD 中列出的核心功能都已實作完成。未實作的主要是:
   - 一些進階的篩選條件
   - 某些特殊的通知情境
   這些都可以在現有基礎上快速擴充。

---

##  快速開始

\\\powershell
# 1. 啟動後端
cd pet-adoption-platform/backend
npm run dev

# 2. 載入測試資料 (新視窗)
cd pet-adoption-platform/backend
node seed.js

# 3. 啟動前端 (新視窗)
cd pet-adoption-platform/frontend
npm start

# 4. 開啟瀏覽器測試
# - 首頁: http://localhost:3000
# - 寵物列表: http://localhost:3000/pets
# - 社群: http://localhost:3000/community
# - API 文件: http://localhost:5000/api-docs
\\\

---

##  更多資訊

- **資料載入指南**: 查看 DATA_LOADING_GUIDE.md
- **API 文件**: http://localhost:5000/api-docs
- **專案文件**: 查看 README.md
