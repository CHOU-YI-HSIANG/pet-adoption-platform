# E2E 測試使用指南

## 快速開始

### 方法 1: 使用自動化腳本 (推薦)

在專案根目錄執行:
```bash
run-e2e-tests.bat
```

此腳本會:
1. 自動檢查並啟動後端服務 (port 5000)
2. 自動檢查並啟動前端服務 (port 3000)
3. 提供互動式選單選擇測試執行方式

### 方法 2: 手動啟動

#### 步驟 1: 啟動後端服務
```bash
cd backend
node server.js
```

#### 步驟 2: 啟動前端服務 (新終端)
```bash
cd frontend
npm start
```

#### 步驟 3: 執行 E2E 測試 (新終端)
```bash
cd frontend

# 執行所有測試
npm run test:e2e

# 使用 UI 模式 (推薦，可視化除錯)
npm run test:e2e:ui

# 有頭模式 (可看到瀏覽器)
npm run test:e2e:headed
```

## 測試配置

### 超時設定
- 測試超時: 60 秒
- 動作超時: 15 秒
- 導航超時: 30 秒
- 預期超時: 10 秒

### 重試機制
- 本地開發: 失敗時重試 1 次
- CI 環境: 失敗時重試 2 次

### 測試報告
- 列表報告: 即時顯示測試進度
- HTML 報告: 測試完成後生成 (playwright-report/)
- 截圖: 測試失敗時自動擷取
- 影片: 測試失敗時錄製

## 測試涵蓋範圍

### 首頁測試 (home.spec.js)
-  載入首頁和標題驗證
-  精選寵物區塊顯示
-  導航選單功能

### 認證測試 (auth.spec.js)
-  開啟登入頁面
-  管理員登入流程

### 寵物瀏覽測試 (pets.spec.js)
-  瀏覽寵物列表
-  使用篩選功能
-  查看寵物詳情

### 管理員儀表板測試 (dashboard.spec.js)
-  存取管理員儀表板
-  點擊統計卡片導航
-  查看寵物管理

## 測試狀態

| 測試類型 | 通過 | 總數 | 成功率 |
|---------|------|------|--------|
| 首頁測試 | 2/3 | 3 | 67% |
| 認證測試 | 0/2 | 2 | 0% |
| 寵物測試 | 3/3 | 3 | 100%  |
| 儀表板測試 | 0/3 | 3 | 0% |
| **總計** | **5/11** | **11** | **45%** |

*最後更新: 2025-11-29*

## 常見問題

### Q: 測試失敗顯示 "Cannot find element"
**A**: 確保前後端服務都已正常啟動並完全載入。等待約 30 秒讓 React 應用完全編譯。

### Q: 測試超時
**A**: 
1. 檢查網路連線
2. 確認資料庫連線正常
3. 清除瀏覽器快取: `npx playwright clean`

### Q: 如何除錯測試?
**A**: 使用 UI 模式最方便:
```bash
npm run test:e2e:ui
```
可以:
- 逐步執行測試
- 查看每個步驟的截圖
- 檢視 DOM 結構
- 重新執行失敗的測試

### Q: 如何執行單一測試檔案?
**A**:
```bash
npx playwright test e2e/pets.spec.js
```

### Q: 如何更新測試快照?
**A**:
```bash
npx playwright test --update-snapshots
```

## 改進建議

### 已優化項目 
1. 增加等待時間處理 React 渲染延遲
2. 使用更靈活的選擇器策略
3. 改善錯誤處理和重試機制
4. 增加詳細的超時設定

### 待改進項目 
1. 修復認證測試 (需要檢查登入頁面元素)
2. 在組件中加入 `data-testid` 屬性
3. 建立測試資料種子腳本
4. 整合 CI/CD 自動化測試

## 技術細節

### Playwright 配置
- 瀏覽器: Chromium (Desktop Chrome)
- 視窗大小: 1280x720
- 並行執行: 關閉 (workers: 1)
- 基礎 URL: http://localhost:3000

### 測試資料
- 管理員帳號: admin@petadoption.com
- 管理員密碼: Admin123456

## 參考資源

- [Playwright 官方文檔](https://playwright.dev)
- [測試最佳實踐](https://playwright.dev/docs/best-practices)
- [選擇器指南](https://playwright.dev/docs/selectors)

