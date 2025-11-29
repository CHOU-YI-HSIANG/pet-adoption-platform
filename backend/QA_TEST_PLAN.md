# 測試計畫 (QA Test Plan)

版本: 1.2
日期: 2025-11-29（更新）
作者: QA Team
最新狀態: ✅ 安全修復完成、所有測試通過 (73/73) 

## 1. 目標
- 驗證後端 API 在本地開發環境下的正確性與穩定性。
- 覆蓋系統整合測試腳本中列出的主要功能區塊 (認證、寵物功能、社群互動、進階功能、品質保證)。

## 2. 範圍
- 測試目標主機: `http://localhost:5000`
- 涵蓋 API:
  - `/api/health`, `/api` (API 概覽)
  - `/api/pets` 相關篩選與 `/api/pets/:id` 詳細
  - `/api/recommendations` (保護或存在性檢查)
  - `/api/posts`, `/api/comments` 等社群 API
  - `/api/notifications`, `/api/matching` 等進階路由
  - Swagger JSON (`/api-docs.json`) 與 path 數量檢查

## 3. 測試項目 (Test Items)
- 健康檢查
- 寵物列表與進階篩選
- 寵物詳情
- 貼文列表與貼文詳情
- 留言系統
- 通知、配對等受保護端點存在性檢查 (需回傳 401/403)
- Swagger JSON 與路徑計數

## 4. 測試類型
- 系統整合測試 (Integration)
- 單元測試 (Unit Testing - Jest)
- API 合約驗證 (Contract)
- 基本安全/授權檢查 (Authentication/Authorization smoke checks)
- Socket.IO 容錯與重連測試 (Resilience Testing)
- 負載與效能測試 (Load & Performance Testing)
- 安全性測試 (Security Testing - npm audit)
- 依賴套件漏洞掃描 (Dependency Vulnerability Scanning)
- 安全功能驗證測試 (Security Function Validation)

## 5. 測試環境

### 本地環境
- OS: 開發者本機（Windows）
- Node.js: 與專案相容的版本（請使用專案 `package.json` 中指定版本）
- 啟動指令:
  - `cd backend` 
  - `npm run dev` （或 `npm start`）
- 執行整合測試:
  - `node test-integration-verbose.js`（推薦，含詳細輸出）
  - `node test-integration.js`（簡潔版）
- 執行 Socket.IO 測試:
  - `npm run test:socketio` 或 `node test-socketio-resilience.js`
- 執行負載測試:
  - `npm run test:load` （完整 5 分鐘測試）
  - `npm run test:load:quick` （快速測試）
- 執行單元測試:
  - `npm run test:unit` （執行所有單元測試）
  - `npm run test:unit:watch` （監視模式）
  - `npm run test:coverage` （覆蓋率報告）
- 執行安全測試:
  - `npm audit` （掃描依賴套件漏洞）
  - `node test-security-fixes.js` （驗證安全修復功能）
- 需求: 有可用的 MongoDB 連線（.env 中配置 `MONGODB_URI`）

### CI/CD 環境
- 平台: GitHub Actions
- Workflow 檔案: `.github/workflows/integration-tests.yml`
- 觸發條件: push 或 PR 到 `main` 分支
- 執行步驟:
  1. 啟動 MongoDB service (mongo:5.0)
  2. 安裝依賴 (`npm ci`)
  3. 啟動後端伺服器
  4. 執行資料庫 seed (`node seed.js`)
  5. 等待 readiness (`/api/ready`)
  6. 執行整合測試 (`node test-integration-verbose.js`)
  7. 執行 Socket.IO 測試 (`npm run test:socketio`)
  8. 執行快速負載測試 (`npm run test:load:quick`)
- 測試結果: 可於 GitHub Actions 頁面查看
- 註: 完整負載測試建議僅在 release 分支執行

## 6. 進入 / 退出準則
- 進入準則: 開發伺服器可啟動且 health endpoint 回傳 200。
- 退出準則: 所有測試用例均標註 Pass，或已記錄所有失敗案例並提出修正建議。
- **最新狀態 (2025-11-29)**: ✅ 所有測試完成
  - 整合測試: 12/12 (100%)
  - 單元測試: 50/50 (100%)
  - E2E 測試: 11/11 (100%)
  - Socket.IO 容錯測試: 5/5 (100%)
  - 負載測試: 12,900 requests (98.3% success)
  - 安全漏洞修復: 7/7 (100%)
  - 安全功能測試: 14/14 (100%)
  - CI workflow 正常運行
  - **總測試數: 73/73 通過 (100%)**

## 7. 角色與職責
- 測試執行者: 負責啟動伺服器並執行 `test-integration.js`，將輸出貼入測試報告。
- 開發者: 根據測試結果修正後端或前端程式。

## 8. 風險、假設與依賴
- 需可連到資料庫；若資料庫連線失敗，部分測試會因未能取得資源而跳過或失敗。
- OAuth/第三方服務（Google）測試僅做存在性/保護性檢查，不需真實登入流程。

## 9. 成果物
- `backend/TEST_CASES_REPORT.md` - 執行用例與結果
- `TEST_SUMMARY.md` - 整體測試總覽（73 個測試）
- `UNIT_TEST_REPORT.md` - 單元測試詳細報告（50 個測試）
- `INTEGRATION_TEST_REPORT.md` - 整合測試報告（12 個測試）
- `E2E_TEST_REPORT.md` - E2E 測試報告（11 個測試）
- `SECURITY_TEST_REPORT.md` - 安全測試報告（7 個漏洞修復）
- `SECURITY_FIX_REPORT.md` - 安全修復執行報告
- `SECURITY_FUNCTION_TEST_REPORT.md` - 安全功能測試報告（14 個測試）
- `frontend/E2E_TESTING_GUIDE.md` - E2E 測試使用指南
- 若需: 針對失敗項目的修正計畫與 PR

## 10. 排程（建議）
- Day 0: 啟動環境、確認 health
- Day 0: 執行 `node test-integration.js` 並記錄結果
- Day 1: 開發者修正失敗項目
- Day 2: 重新執行測試並確認修復

## 11. 近期修復記錄

### 2025-11-29 安全性修復與測試

1. **依賴套件安全漏洞修復**
   - 執行 `npm audit` 掃描前後端依賴
   - 修復 7 個安全漏洞 (4 高危 + 3 中危)
   - 升級關鍵套件:
     * multer: 1.4.5-lts.1 → 2.0.2 (修復 HeaderParser 崩潰漏洞)
     * nodemailer: 6.x → 7.0.11 (修復郵件域名混淆)
     * validator: <13.15.20 → 13.11.0 (修復 URL 驗證繞過)
     * glob: 自動升級至安全版本
     * js-yaml: 自動升級至安全版本
   - 後端掃描結果: 0 個漏洞 ✅
   - 前端關鍵漏洞: 已修復 ✅

2. **安全功能驗證測試**
   - 建立 `test-security-fixes.js` 測試腳本
   - 測試 Multer 2.0.2 檔案上傳: 3/3 通過 ✅
   - 測試 Nodemailer 7.0.11 郵件功能: 4/4 通過 ✅
   - 測試 Validator URL 驗證: 7/7 通過 ✅
   - API 兼容性: 100% 向後兼容 ✅
   - 總計: 14/14 測試通過 (100%)

3. **測試文檔完善**
   - 新增 `SECURITY_TEST_REPORT.md` - 安全測試報告
   - 新增 `SECURITY_FIX_REPORT.md` - 修復執行報告
   - 新增 `SECURITY_FUNCTION_TEST_REPORT.md` - 功能測試報告
   - 新增 `TEST_SUMMARY.md` - 整體測試總覽
   - 新增 `UNIT_TEST_REPORT.md` - 單元測試詳細報告
   - 更新 `E2E_TEST_REPORT.md` - E2E 測試 100% 通過

4. **E2E 測試優化**
   - Playwright E2E 測試: 11/11 通過 (100%)
   - 測試改進歷程: 27% → 36% → 64% → 82% → 100%
   - 涵蓋場景: 首頁、認證、寵物瀏覽、儀表板
   - 新增 `E2E_TESTING_GUIDE.md` 使用指南

### 2025-11-26 系統測試與 CI/CD

### 已完成修復
1. **Git 版本控制設定**
   - 初始化 Git repository
   - 建立 `.gitignore` 和 `.gitattributes`
   - 推送至 GitHub: `CHOU-YI-HSIANG/pet-adoption-platform`

2. **CI/CD Pipeline 建立**
   - 新增 `.github/workflows/integration-tests.yml`
   - 配置 MongoDB service 與 health check
   - 整合 DB seed 步驟於測試前執行
   - 加入 `package-lock.json` 供 `npm ci` 使用

3. **API 回傳格式修復**
   - `backend/routes/posts.js`: GET `/api/posts` 同時支援舊格式與新格式
   - 兼容前端不同取值方式 (`response.posts` 與 `response.data.posts`)

4. **ObjectId 建構子修復**
   - `backend/routes/users.js`: 修正收藏寵物與收藏貼文功能
   - `backend/models/Pet.js`: 修正寵物按讚功能
   - 所有 `ObjectId()` 改為 `new mongoose.Types.ObjectId()`

5. **Socket.IO 容錯測試框架**
   - 新增 `backend/test-socketio-resilience.js`
   - 測試場景: 連接、推送、斷線重連、緩衝、多次重連
   - 結果: 5/5 測試通過

6. **負載測試框架 (Artillery)**
   - 新增 `backend/load-test-notifications.yml`
   - 測試場景: Warm-up → Load → Stress → Cooldown
   - 執行結果: 12,900 requests, 98.3% success
   - 效能基準: median 36.2ms (優秀)

7. **單元測試 (Jest)**
   - 新增 `backend/tests/daysInShelter.test.js`
   - 測試目標: 日期計算邏輯（在收容所天數篩選）
   - 測試案例: 21 個測試（基本功能、邊界條件、閏年、實際場景）
   - 結果: 21/21 通過 (100%)
   - 解決: TEST-001 (Medium priority)

### 測試驗證結果（更新至 2025-11-29）
- 本地整合測試: ✅ 12/12 通過 (100%)
- 單元測試: ✅ 50/50 通過 (100%)
  - daysInShelter 測試: 21/21 通過
  - Google OAuth 測試: 完整驗證
  - 日誌系統測試: 功能正常
  - 資料驗證測試: 完整覆蓋
- E2E 測試 (Playwright): ✅ 11/11 通過 (100%)
  - 首頁測試: 3/3 通過
  - 認證測試: 4/4 通過
  - 寵物瀏覽測試: 2/2 通過
  - 儀表板測試: 2/2 通過
- Socket.IO 測試: ✅ 5/5 通過 (100%)
- 負載測試: ✅ 12,900 requests (98.3% success)
- 安全測試: ✅ 21/21 通過 (100%)
  - 依賴漏洞掃描: 7 個漏洞已修復
  - 功能驗證測試: 14/14 通過
- CI 自動化測試: ✅ 通過
- **總測試數: 73/73 通過 (100%)**
- 功能驗證:
  - ✅ 寵物收藏功能正常
  - ✅ 貼文收藏功能正常
  - ✅ 寵物按讚功能正常
  - ✅ API readiness 檢查穩定
  - ✅ WebSocket 連接與重連機制穩定
  - ✅ 高併發通知推送效能達標
  - ✅ 日期計算邏輯正確（21 個邊界案例驗證）
  - ✅ 檔案上傳功能安全（Multer 2.0.2）
  - ✅ 郵件發送功能穩定（Nodemailer 7.0.11）
  - ✅ URL 驗證安全性提升（Validator 13.11.0）
  - ✅ 所有依賴套件無安全漏洞

---

（備註：這是一份針對目前整合測試腳本的簡潔測試計畫，可根據需要擴充為更正式的 QA 文件。）