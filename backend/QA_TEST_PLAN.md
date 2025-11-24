# 測試計畫 (QA Test Plan)

版本: 1.0
日期: 2025-11-24
作者: 

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
- API 合約驗證 (Contract)
- 基本安全/授權檢查 (Authentication/Authorization smoke checks)

## 5. 測試環境
- OS: 開發者本機（Windows）
- Node.js: 與專案相容的版本（請使用專案 `package.json` 中指定版本）
- 啟動指令:
  - `cd backend` 
  - `npm run dev` （或 `npm start`）
- 執行整合測試:
  - `node test-integration.js`
- 需求: 有可用的 MongoDB 連線（.env 中配置 `MONGODB_URI`）

## 6. 進入 / 退出準則
- 進入準則: 開發伺服器可啟動且 health endpoint 回傳 200。
- 退出準則: 所有測試用例均標註 Pass，或已記錄所有失敗案例並提出修正建議。

## 7. 角色與職責
- 測試執行者: 負責啟動伺服器並執行 `test-integration.js`，將輸出貼入測試報告。
- 開發者: 根據測試結果修正後端或前端程式。

## 8. 風險、假設與依賴
- 需可連到資料庫；若資料庫連線失敗，部分測試會因未能取得資源而跳過或失敗。
- OAuth/第三方服務（Google）測試僅做存在性/保護性檢查，不需真實登入流程。

## 9. 成果物
- `backend/TEST_CASES_REPORT.md`（執行用例與結果）
- 若需: 針對失敗項目的修正計畫與 PR

## 10. 排程（建議）
- Day 0: 啟動環境、確認 health
- Day 0: 執行 `node test-integration.js` 並記錄結果
- Day 1: 開發者修正失敗項目
- Day 2: 重新執行測試並確認修復

---

（備註：這是一份針對目前整合測試腳本的簡潔測試計畫，可根據需要擴充為更正式的 QA 文件。）