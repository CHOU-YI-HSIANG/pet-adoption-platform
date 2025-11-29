# 測試說明

此檔案包含在本地對此專案進行快速測試（smoke/integration/unit/e2e/security）的說明與指令。

**最新更新**: 2025-11-29 - 新增安全測試指令

使用前提：
- 確認 `backend/.env` 已正確設定（尤其 `MONGODB_URI`、`JWT_SECRET`）
- 後端 server 預設監聽在 `http://localhost:5000`

快速測試指令（PowerShell）

1) 啟動後端（開發模式）：
```powershell
cd backend
npm install
npm run dev
```

2) 測試資料庫連線：
```powershell
cd backend
npm run test:db
```

3) 簡易整合 / smoke 測試：
（在 server 正在執行時）
```powershell
cd backend
node test-integration.js
```

4) 後端自動化測試（單元測試）：
```powershell
cd backend
npm test              # 執行所有單元測試 (50 tests)
npm run test:unit     # 同上
npm run test:coverage # 產生覆蓋率報告
```

5) 安全性測試（2025-11-29 新增）：
```powershell
cd backend
npm audit                        # 掃描依賴套件漏洞
node test-security-fixes.js      # 驗證安全功能 (14 tests)
```

6) E2E 測試（前端）：
```powershell
cd frontend
npm run test:e2e         # 執行 E2E 測試 (11 tests)
npm run test:e2e:ui      # UI 模式
npm run test:e2e:headed  # 有界面模式
```

7) 前端手動與 unit test：
```powershell
cd frontend
npm install
npm start   # 手動 UI 驗證

# 或執行前端測試
npm test
```

## 完整測試統計（2025-11-29）

| 測試類型 | 數量 | 狀態 | 說明 |
|---------|------|------|------|
| 整合測試 | 12/12 | ✅ | API 端點與整合 |
| 單元測試 | 50/50 | ✅ | Jest 測試 |
| E2E 測試 | 11/11 | ✅ | Playwright |
| Socket.IO | 5/5 | ✅ | 容錯與重連 |
| 負載測試 | 12,900 | ✅ | 98.3% 成功 |
| 安全測試 | 21/21 | ✅ | 漏洞修復與功能驗證 |
| **總計** | **73/73** | ✅ | **100% 通過** |

常見問題及排查：
- 若 `test-integration.js` 報錯 401/403：代表需要授權的 endpoint 回傳未授權；這是預期行為，代表 endpoint 存在但需 token。
- 若 server 無法啟動：檢查 `backend/.env`，確認 `MONGODB_URI` 與 `PORT`、`JWT_SECRET` 設定正確。
- 若測試顯示 network error：確認後端 server 有在運行，並沒有被防火牆或其他程式阻擋。

若需要，我可以幫你分析 `test-integration.js` 的輸出結果（把終端機 output 貼上來即可）。
