#  生產部署檢查清單

**專案**: Pet Adoption Platform
**版本**: v1.0
**更新日期**: 2025-11-26

##  部署前檢查 (Pre-deployment)

### 1. 程式碼品質 
- [x] 所有測試通過 (17/17 tests)
- [x] CI/CD Pipeline 通過
- [x] 無 linting 錯誤
- [x] 程式碼審查完成
- [x] Quality Gates 通過 (Story 1.1, 3.1)

### 2. 環境配置 
- [ ] 生產環境變數檔案準備完成 (參考 `environment-variables.md`)
- [ ] MongoDB Atlas/生產資料庫連線測試通過
- [ ] SSL/TLS 憑證配置完成
- [ ] DNS 設定完成
- [ ] CDN 配置 (如適用)

### 3. 安全性 
- [ ] 所有敏感資訊移至環境變數
- [ ] API rate limiting 已啟用
- [ ] CORS 設定正確 (僅允許生產域名)
- [ ] Helmet.js 安全標頭已啟用
- [ ] Session secret 已更換為強密碼
- [ ] 資料庫使用者權限最小化

### 4. 效能優化 
- [x] Response compression 已啟用
- [x] MongoDB 索引已建立
- [x] Socket.IO 連線優化完成
- [ ] 靜態資源 CDN (如適用)
- [ ] 負載測試基準建立

### 5. 監控與日誌 
- [ ] 應用程式日誌配置 (參考 `backend/LOGGING.md`)
- [ ] 錯誤追蹤系統 (Sentry/類似工具)
- [ ] 效能監控 (New Relic/類似工具)
- [ ] 健康檢查端點測試 (`/api/health`, `/api/ready`)
- [ ] 告警規則設定

### 6. 備份與還原 
- [ ] 資料庫備份策略建立
- [ ] 備份還原測試完成
- [ ] 備份排程設定 (建議每日)
- [ ] 災難恢復計畫文檔化

### 7. 部署計畫 
- [ ] 部署步驟文檔化 (參考 `deployment-guide.md`)
- [ ] Rollback 計畫準備
- [ ] 維護視窗通知發送
- [ ] 資料庫遷移腳本測試 (如適用)

---

##  部署步驟 (Deployment)

### 步驟 1: 準備階段
```bash
# 1. 拉取最新程式碼
git pull origin main

# 2. 安裝依賴 (production only)
cd backend && npm ci --production
cd ../frontend && npm ci --production

# 3. 建置前端
cd frontend && npm run build
```

### 步驟 2: 環境設定
```bash
# 1. 複製環境變數模板
cp .env.example .env.production

# 2. 填寫生產環境變數 (參考 environment-variables.md)
nano .env.production

# 3. 驗證配置
npm run config:verify  # 如有此腳本
```

### 步驟 3: 資料庫準備
```bash
# 1. 備份現有資料庫 (如有)
mongodump --uri="<PRODUCTION_MONGODB_URI>" --out=./backup-$(date +%Y%m%d-%H%M%S)

# 2. 執行遷移 (如適用)
npm run migrate

# 3. 驗證索引
node backend/scripts/verify-indexes.js
```

### 步驟 4: 啟動服務
```bash
# 使用 PM2 或類似的程序管理器
pm2 start backend/server.js --name pet-adoption-api -i max
pm2 save
pm2 startup  # 設定開機自啟

# 或使用 systemd (Linux)
sudo systemctl start pet-adoption-api
sudo systemctl enable pet-adoption-api
```

### 步驟 5: 驗證部署
```bash
# 1. 健康檢查
curl https://your-domain.com/api/health
curl https://your-domain.com/api/ready

# 2. 執行煙霧測試
npm run test:smoke  # 快速功能測試

# 3. 檢查日誌
pm2 logs pet-adoption-api --lines 50
```

---

##  部署後檢查 (Post-deployment)

### 立即檢查 (0-30分鐘)
- [ ] 健康檢查端點回應正常
- [ ] 前端頁面載入正常
- [ ] 使用者登入功能正常
- [ ] Socket.IO 即時通知正常
- [ ] API 回應時間正常 (< 200ms p95)
- [ ] 無錯誤日誌出現

### 短期監控 (1-24小時)
- [ ] CPU/記憶體使用率正常
- [ ] 資料庫連線穩定
- [ ] 無異常錯誤率飆升
- [ ] 使用者回報無重大問題
- [ ] 效能指標符合基準

### 中期監控 (1-7天)
- [ ] 所有功能穩定運作
- [ ] 無效能退化
- [ ] 備份正常執行
- [ ] 監控告警正常
- [ ] 使用者反饋正向

---

##  Rollback 程序

### 觸發條件
- 重大功能故障
- 資料庫損壞
- 效能嚴重退化 (p95 > 500ms)
- 安全漏洞發現

### Rollback 步驟
```bash
# 1. 停止當前服務
pm2 stop pet-adoption-api

# 2. 還原程式碼到上一個版本
git revert HEAD  # 或 git checkout <previous-commit>

# 3. 還原資料庫 (如必要)
mongorestore --uri="<PRODUCTION_MONGODB_URI>" --drop ./backup-<timestamp>

# 4. 重啟服務
pm2 restart pet-adoption-api

# 5. 驗證 rollback
curl https://your-domain.com/api/health
```

---

##  緊急聯絡

**部署負責人**: [填寫姓名]
**電話**: [填寫電話]
**Email**: [填寫Email]

**DevOps 團隊**: [填寫聯絡資訊]
**資料庫管理員**: [填寫聯絡資訊]

---

##  相關文檔

- [環境變數說明](./environment-variables.md)
- [部署指南](./deployment-guide.md)
- [監控設定](./monitoring-setup.md)
- [日誌管理](../backend/LOGGING.md)
- [API 文檔](../backend/SWAGGER_API_DOCS.md)

---

**最後更新**: 2025-11-26
**維護者**: Dev Team (James)
