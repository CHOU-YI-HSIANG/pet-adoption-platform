# 測試設計：P0 全套（Readiness / Core Pets / Favorites / Integration Regression）

版本：2025-11-24

目的：驗證系統在啟動後能穩定就緒（readiness）、核心寵物列表與詳情契約、我的收藏同步行為，並以整合回歸測試（verbose）確認整體行為。

重要說明：本設計偏重可複製的手動/自動化步驟（PowerShell / node / curl），可直接用於 QA 工具的 Test Case 欄位或 CI job。

---

環境與前置條件
- Node.js 16+、已安裝後端依賴（在 `backend` 目錄執行 `npm install`）。
- MongoDB 可用（本地或測試集群），`MONGODB_URI` 設定於 `backend/.env`。
- 若需模擬授權（JWT），請準備一組測試用帳號與 token（可使用內建 seed 或 `create-admin.js`）。
- 建議在本地或 CI 設定：
  - `DB_CONNECT_MAX_RETRIES`（建議 CI 值：60）
  - `DB_CONNECT_DELAY_MS`（建議 CI 值：2000）
  - `READINESS_RETRIES`（建議 CI 值：60）
  - `READINESS_DELAY_MS`（建議 CI 值：2000）

測試資料準備（Recommend seeding）
- 若 repo 提供 `seed.js` 或 `seed` script，請先執行以建立測試用寵物、貼文與使用者。範例：
  ```powershell
  cd backend
  node seed.js
  ```
- 必備資料：至少 5 筆 `pets`（包含不同 species/size）、至少 10 篇 `posts`、1 個測試用使用者（含 favorites 初始狀態）。

測試腳本與工具
- 手動 / 快速檢查：`node -e "...axios get /api/ready"`（在 README 範例中）
- 自動化：`backend/test-integration-verbose.js`（已新增）

---

測試案例（Test Cases）

1) Readiness & Health（P0）
 - 目的：伺服器啟動後 DB 必須就緒，避免整合測試 race condition。
 - 前置：無（或已啟動後端）。
 - 步驟（可複製執行）：
   1. 啟動後端：`cd backend; npm run dev`（或 `node server.js`）。
   2. 在另一 terminal 執行（PowerShell）：
      ```powershell
      # 等待 readiness（以 env 設定為準）
      $env:READINESS_RETRIES=60; $env:READINESS_DELAY_MS=2000
      node -e "const axios=require('axios');(async()=>{for(let i=0;i<parseInt(process.env.READINESS_RETRIES);i++){try{const r=await axios.get('http://localhost:5000/api/ready',{timeout:1000});if(r.status===200 && r.data.ready){console.log('READY OK');process.exit(0)} }catch(e){console.log('not ready',i+1); await new Promise(r=>setTimeout(r,parseInt(process.env.READINESS_DELAY_MS)));}}; console.error('NOT READY'); process.exit(2)})()"
      ```
 - 預期：在 `READINESS_RETRIES` 範圍內，`/api/ready` 回 200 且 body.ready === true；`/api/health` 回 200 且 `status==='ok'`。
 - 清理：無
 - 自動化備註：CI job 在啟動服務後先執行此等待步驟再跑測試。

2) Core Pets: 列表與篩選（P0）
 - 目的：確認 `GET /api/pets` 能正確處理篩選參數與分頁。
 - 前置：測試資料已 seed。
 - 步驟：
   ```powershell
   # 範例：使用 curl (or PowerShell Invoke-RestMethod)
   curl "http://localhost:5000/api/pets?species=dog&size=medium&limit=5"
   ```
 - 預期：HTTP 200；回傳 JSON 內 `pets` 為陣列；每筆至少含 `_id,name,species,size,age`。
 - 驗證細節：若 `limit` 指定為 5，返回陣列長度 <= 5，且 `species==='dog'` 或 `size==='medium'` 欄位值正確（視資料而定）。
 - 清理：無
 - 自動化：可用 `axios` 或 `supertest` 驗證 response schema。

3) Pet Detail: 回傳契約（P0）
 - 目的：確認 `GET /api/pets/:id` 回傳格式為 `{ pet: { ... } }`。
 - 前置：取得一個有效的 pet id（由上一測試或 seed）。
 - 步驟（PowerShell / node）：
   ```powershell
   # 範例 node
   node -e "const axios=require('axios');(async()=>{const list=await axios.get('http://localhost:5000/api/pets?limit=1'); const id=list.data.pets[0]._id; const res=await axios.get(`http://localhost:5000/api/pets/${id}`); console.log(res.data);})()"
   ```
 - 預期：HTTP 200，回傳物件包含 `pet` 並含 `_id,name,description,photos` 等欄位；`pet._id===:id`。
 - 清理：無
 - 自動化備註：對 schema 使用 AJV 或直接斷言欄位存在。

4) Favorites 同步（P0）
 - 目的：驗證使用者按愛心（favorites）後，後端資料與前端 cache（或 user profile）能被更新。
 - 前置：有一個測試帳號（token），且至少 1 個 pet id。
 - 步驟（API-level）：
   1. 取得 token（或使用 seed 的 test user）。
   2. 呼叫 `POST /api/users/me/favorites` 或 `PUT /api/users/:id/favorites/:petId`（視實作）來新增 favorite；請使用 Authorization header。
   3. 呼叫 `GET /api/users/me` 或 `GET /api/users/:id/favorites` 驗證 favorites 列表已包含該 pet id。
   4. 在前端環境（或模擬）確認 `userStats` 或 `favorites` query 被 invalidated（若無前端環境，依 API 驗證即可）。
 - 範例（PowerShell + node）：
   ```powershell
   # 假設有 token env
   $env:TOKEN="Bearer ..."
   node -e "const axios=require('axios');(async()=>{const pet=(await axios.get('http://localhost:5000/api/pets?limit=1')).data.pets[0]; await axios.post('http://localhost:5000/api/users/me/favorites',{petId:pet._id},{headers:{Authorization:process.env.TOKEN}}); const me=await axios.get('http://localhost:5000/api/users/me',{headers:{Authorization:process.env.TOKEN}}); console.log(me.data.favorites.includes(pet._id));})()"
   ```
 - 預期：新增 favorite 之後，`GET /api/users/me` 回傳包含該 pet id；若後端同時更新 `Pet.likes`，也應同步反映。
 - 清理：可呼叫取消收藏 API 將資料還原。
 - 自動化備註：測試應在隔離的測試使用者上執行，以免污染真實資料。

5) Integration Regression（P0, verbose）
 - 目的：在啟動完整服務後以整合腳本跑完整案例（同本設計中所有核心案例），確認回歸通過。
 - 工具：`node backend/test-integration-verbose.js`
 - 步驟：
   1. 建議先設 env：
      ```powershell
      $env:READINESS_RETRIES=60
      $env:READINESS_DELAY_MS=2000
      $env:DB_CONNECT_MAX_RETRIES=60
      $env:DB_CONNECT_DELAY_MS=2000
      ```
   2. 啟動後端：`npm run dev`（或 background 啟動）
   3. 執行：`node test-integration-verbose.js`
 - 預期：整體測試通過（示例預期為 12/12），或在失敗時輸出具體錯誤以及 readiness 嘗試記錄。
 - 清理：如測試會建立資料（例如 favorites），請於測試結束移除或使用專用測試帳號。
 - 自動化備註：CI 應將此腳本納入 pipeline 並在失敗時收集 `server` 日誌（stdout / winston logs）與 Mongo logs。

---

驗收準則（Exit Criteria）
- 所有 P0 測試在本地可重複通過（>= 95% 成功率，目標 100%）。
- 測試腳本能在 CI 環境中穩定執行（採用推薦 env 參數），且在失敗時能回傳可供 debug 的日誌。

自動化/追蹤建議
- 在 CI 中新增一個 job step：
  1. 啟動後端服務（可使用 docker 或 node）
  2. 等待 `/api/ready` 回 200（可使用 `node` 小腳本或 `curl` 重試 loop）
  3. 執行 `node test-integration-verbose.js`
  4. 若失敗，archive `server` logs 與 `api/ready` 輸出

Gherkin 範例（Readiness）
```
Feature: Backend readiness
  Scenario: Server becomes ready within configured retries
    Given the backend is started
    When I poll GET /api/ready up to READINESS_RETRIES times
    Then the response should be HTTP 200 and body.ready == true
```

Gherkin 範例（Favorites）
```
Feature: Favorites sync
  Scenario: User favorites a pet and it's reflected in profile
    Given a test user with valid JWT
    When the user favorites a pet via POST /api/users/me/favorites
    Then GET /api/users/me should return favorites containing the pet id
```

---

文件位置
- 本設計檔：`backend/TEST_DESIGN_P0.md`
- 已存在相關文件：`backend/POST_MORTEM.md`, `backend/TEST_CASES_REPORT.md`, `backend/test-integration-verbose.js`, `backend/.env.example`

後續（建議）
- 把這些測試故事列為 QA backlog（可直接匯入或我幫你產生 Markdown / CSV）。
- 完成 CI job 範例（我可以產出 GitHub Actions / GitLab CI 範本）。
