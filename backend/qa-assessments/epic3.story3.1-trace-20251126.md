# Requirements Traceability Matrix

## Story: 3.1 - Real-time Notification System

**Date**: 2025-11-26  
**Tracer**: Quinn (QA Agent)

---

## Coverage Summary

- **Total Requirements**: 12
- **Fully Covered**: 8 (66.7%)
- **Partially Covered**: 3 (25%)
- **Not Covered**: 1 (8.3%)

**Overall Assessment**: PASS with CONCERNS

---

## Requirement Mappings

### AC1: Notification Model 支援 12 種通知類型

**Coverage: FULL**

#### Given-When-Then Mappings:

**Unit Test**: `test-notifications.js::createNotification`
- **Given**: 通知資料包含 type, recipient, title, content
- **When**: 調用 Notification.createNotification()
- **Then**: 通知成功建立並儲存至 MongoDB

**Integration Test**: `test-integration.js::testNotifications`
- **Given**: 系統運作中
- **When**: 測試 12 種不同類型的通知建立
- **Then**: 所有類型通知正確儲存，包含正確的 type 欄位

**Model Validation**: `models/Notification.js`
- **Given**: 通知 Schema 定義
- **When**: 建立通知時
- **Then**: type 必須為 enum 中的 12 種類型之一

---

### AC2: API 端點完整實作 (6 個)

**Coverage: FULL**

#### Given-When-Then Mappings:

**Integration Test**: `test-integration.js::testNotifications`
- **Given**: 認證用戶與測試通知資料
- **When**: 依序呼叫 6 個 API 端點
- **Then**: 所有端點回傳正確狀態碼與資料格式
  - GET /api/notifications  200, 通知列表
  - GET /api/notifications/unread-count  200, 未讀數量
  - POST /api/notifications/:id/read  200, 標記成功
  - POST /api/notifications/read-all  200, 全部標記
  - DELETE /api/notifications/:id  200, 刪除成功
  - DELETE /api/notifications  200, 批次刪除

**Authorization Test**: `test-integration.js`
- **Given**: 未認證請求
- **When**: 呼叫通知 API
- **Then**: 回傳 401 Unauthorized

---

### AC3: 未讀數量徽章顯示

**Coverage: FULL**

#### Given-When-Then Mappings:

**Frontend Component**: `NotificationBell.js`
- **Given**: 用戶有 N 則未讀通知
- **When**: 組件載入並呼叫 /api/notifications/unread-count
- **Then**: 紅色徽章顯示正確數量，>9 顯示 "9+"

**Integration Test**: `test-integration.js::testNotifications`
- **Given**: 建立 3 則未讀通知
- **When**: 呼叫 GET /api/notifications/unread-count
- **Then**: 回傳 { count: 3 }

**React Query**: `NotificationBell.js::useQuery`
- **Given**: 組件掛載
- **When**: 每 10 秒輪詢
- **Then**: 自動更新未讀數量

---

### AC4: 通知列表頁面完整功能

**Coverage: FULL**

#### Given-When-Then Mappings:

**Frontend Page**: `NotificationsPage.js`
- **Given**: 用戶進入 /notifications 頁面
- **When**: 頁面載入
- **Then**: 顯示通知列表，包含標題、內容、時間、類型圖示

**Pagination Test**: `NotificationsPage.js::pagination`
- **Given**: 用戶有 30 則通知
- **When**: 滾動到底部
- **Then**: 自動載入下一頁 (每頁 20 則)

**Filter Test**: `NotificationsPage.js::filter tabs`
- **Given**: 通知列表包含已讀與未讀
- **When**: 點擊"未讀"標籤
- **Then**: 只顯示未讀通知

---

### AC5: Socket.IO 即時推送

**Coverage: PARTIAL**

#### Given-When-Then Mappings:

**Backend Implementation**: `models/Notification.js::createNotification`
- **Given**: 通知建立成功
- **When**: 執行 io.to(userId).emit('newNotification', data)
- **Then**: 事件發送到用戶的 Socket.IO 房間

**Frontend Listener**: `NotificationBell.js::useEffect socket`
- **Given**: Socket.IO 連接建立
- **When**: 監聽到 'newNotification' 事件
- **Then**: 觸發 invalidateQueries 更新通知列表與未讀數量

**Gap**:
- 未測試 Socket.IO 連接失敗的容錯
- 未測試斷線重連後的通知補償
- 未測試大量並發推送的效能
- **建議**: 新增 Socket.IO 整合測試，模擬連接異常情況

---

### AC6: 通知觸發整合 (留言/回覆/按讚)

**Coverage: FULL**

#### Given-When-Then Mappings:

**Integration Test**: `test-integration.js::testComments`
- **Given**: 用戶 A 對用戶 B 的貼文留言
- **When**: POST /api/comments
- **Then**: 用戶 B 收到類型為 'comment' 的通知

**Integration Test**: `test-integration.js::testComments`
- **Given**: 用戶 A 回覆用戶 B 的留言
- **When**: POST /api/comments/:id/reply
- **Then**: 用戶 B 收到類型為 'reply' 的通知

**Integration Test**: `test-integration.js::testPosts`
- **Given**: 用戶 A 對用戶 B 的貼文按讚
- **When**: POST /api/posts/:id/like
- **Then**: 用戶 B 收到類型為 'like' 的通知

---

### AC7: 通知觸發整合 (認養狀態變更)

**Coverage: FULL**

#### Given-When-Then Mappings:

**Integration Test**: `test-integration.js::testAdoptions`
- **Given**: 管理員處理認養申請
- **When**: PUT /api/adoptions/:id/status (approved/rejected/completed)
- **Then**: 申請人收到對應類型通知
  - approved  'adoption_approved' (high priority)
  - rejected  'adoption_rejected' (high priority)
  - completed  'adoption_completed' (urgent priority)

**Priority Verification**: `test-notifications.js`
- **Given**: 建立不同優先級通知
- **When**: 查詢通知資料
- **Then**: priority 欄位正確設定 (low/normal/high/urgent)

---

### AC8: 通知觸發整合 (訊息通知)

**Coverage: FULL**

#### Given-When-Then Mappings:

**Integration Test**: `test-integration.js::testMessages`
- **Given**: 用戶 A 發送訊息給用戶 B
- **When**: POST /api/messages
- **Then**: 用戶 B 收到類型為 'message' 的通知，連結指向 /messages/:senderId

**Notification Content**: `routes/messages.js`
- **Given**: 訊息內容為 "Hello"
- **When**: 建立通知
- **Then**: 通知內容為 "用戶 A 發送了一則新訊息"

---

### AC9: 標記已讀功能

**Coverage: FULL**

#### Given-When-Then Mappings:

**Integration Test**: `test-notifications.js::markAsRead`
- **Given**: 用戶有 3 則未讀通知
- **When**: POST /api/notifications/:id/read (標記單一)
- **Then**: 
  - 該通知 isRead 變為 true
  - readAt 時間戳記錄
  - 未讀數量減 1

**Integration Test**: `test-notifications.js::markAllAsRead`
- **Given**: 用戶有 5 則未讀通知
- **When**: POST /api/notifications/read-all
- **Then**: 
  - 所有通知 isRead 變為 true
  - 未讀數量變為 0

**Frontend Integration**: `NotificationsPage.js::markAllRead button`
- **Given**: 頁面顯示未讀通知
- **When**: 點擊"全部標記為已讀"
- **Then**: 通知視覺狀態更新，未讀徽章歸零

---

### AC10: 刪除通知功能

**Coverage: FULL**

#### Given-When-Then Mappings:

**Integration Test**: `test-notifications.js::deleteNotification`
- **Given**: 用戶有 N 則通知
- **When**: DELETE /api/notifications/:id
- **Then**: 
  - 該通知從資料庫刪除
  - 通知數量減 1

**Integration Test**: `test-notifications.js::bulkDelete`
- **Given**: 用戶有 3 則已讀通知
- **When**: DELETE /api/notifications (批次刪除)
- **Then**: 
  - 所有已讀通知刪除
  - 未讀通知保留

---

### AC11: TTL 自動過期清理

**Coverage: PARTIAL**

#### Given-When-Then Mappings:

**Model Schema**: `models/Notification.js::expiresAt index`
- **Given**: 通知建立時設定 expiresAt = 30 天後
- **When**: MongoDB TTL index 運作
- **Then**: 過期通知自動刪除

**Static Method**: `Notification.deleteExpired()`
- **Given**: 資料庫有過期通知
- **When**: 手動呼叫 deleteExpired()
- **Then**: 過期通知被刪除

**Gap**:
- 未測試 TTL index 的實際運作
- 未設定定期清理 Cron Job
- **建議**: 
  1. 新增 MongoDB TTL 驗證測試
  2. 實作定期清理任務 (每日執行)

---

### AC12: 效能與可擴展性

**Coverage: NOT COVERED**

#### Expected Scenarios:

**Load Test**: (未實作)
- **Given**: 1000 個並發用戶
- **When**: 同時收到通知推送
- **Then**: 
  - Socket.IO 連接穩定
  - 推送延遲 < 1 秒
  - CPU/Memory 使用率正常

**Database Performance**: (部分實作)
- **Given**: 100,000 則通知記錄
- **When**: 查詢未讀數量
- **Then**: 回應時間 < 100ms (複合索引優化)

**Socket.IO Stress Test**: (未實作)
- **Given**: 頻繁的連接/斷線
- **When**: 大量用戶進出
- **Then**: 伺服器穩定運作，無記憶體洩漏

**Gaps**:
- **無負載測試**: 未驗證大量並發場景
- **無效能基準**: 未設定回應時間 SLA
- **無壓力測試**: 未測試極限容量
- **建議**: 使用 k6 或 Artillery 進行負載測試

---

## Critical Gaps

### 1. Socket.IO 容錯與重連機制

- **Gap**: 未測試連接失敗、斷線重連的容錯行為
- **Risk**: High - 生產環境可能遇到網路不穩定
- **Action**: 新增 Socket.IO 整合測試
- **Suggested Test**:
  ```javascript
  describe('Socket.IO Resilience', () => {
    test('should reconnect after disconnect', async () => {
      // 模擬斷線
      socket.disconnect();
      await sleep(1000);
      
      // 應自動重連
      expect(socket.connected).toBe(true);
    });
    
    test('should buffer notifications during disconnect', async () => {
      socket.disconnect();
      // 發送通知
      await createNotification({ recipient: userId });
      
      socket.connect();
      // 應收到緩衝的通知
      await waitFor(() => {
        expect(receivedNotifications.length).toBe(1);
      });
    });
  });
  ```

### 2. 效能與負載測試

- **Gap**: 完全缺少負載測試與效能基準
- **Risk**: High - 無法保證生產環境效能
- **Action**: 實作負載測試套件
- **Suggested Tests**:
  
  **負載測試場景 (k6)**:
  ```javascript
  export default function() {
    // 場景 1: 1000 並發查詢未讀數量
    http.get('http://localhost:5000/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // 場景 2: 100 並發通知推送
    // 場景 3: 大量標記已讀操作
  }
  
  export let options = {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 1000 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<200'], // 95% 請求 < 200ms
      http_req_failed: ['rate<0.01'],   // 失敗率 < 1%
    },
  };
  ```

### 3. TTL 自動清理驗證

- **Gap**: MongoDB TTL index 未在測試環境驗證
- **Risk**: Medium - 過期通知可能未正確清理
- **Action**: 新增 TTL 驗證測試 + 定期清理任務
- **Suggested Implementation**:
  
  **測試**:
  ```javascript
  test('TTL should delete expired notifications', async () => {
    // 建立已過期通知 (expiresAt = 昨天)
    await Notification.create({
      recipient: userId,
      type: 'system',
      title: 'Old notification',
      expiresAt: new Date(Date.now() - 86400000)
    });
    
    // 等待 TTL index 運作 (可能需要 60 秒)
    await sleep(65000);
    
    // 驗證通知已刪除
    const count = await Notification.countDocuments({ expiresAt: { $lt: new Date() } });
    expect(count).toBe(0);
  }, 120000);
  ```
  
  **Cron Job** (使用 node-cron):
  ```javascript
  const cron = require('node-cron');
  
  // 每日凌晨 2 點清理過期通知
  cron.schedule('0 2 * * *', async () => {
    console.log('Running notification cleanup...');
    const deleted = await Notification.deleteExpired();
    console.log(`Deleted ${deleted} expired notifications`);
  });
  ```

---

## Test Design Recommendations

### 1. 新增 Socket.IO 整合測試套件

**優先級**: High  
**範圍**:
- 連接/斷線/重連機制
- 通知推送延遲測試
- 房間機制正確性
- 並發連接壓力測試

**工具建議**: socket.io-client + Jest

---

### 2. 實作負載測試

**優先級**: High  
**範圍**:
- 通知查詢 API (1000 並發)
- Socket.IO 推送 (100 並發)
- 標記已讀操作 (大量批次)
- 資料庫查詢效能 (10 萬筆資料)

**工具建議**: k6 或 Artillery

**效能基準**:
- API 回應時間: p95 < 200ms
- Socket.IO 推送延遲: < 1s
- 資料庫查詢: < 100ms
- 失敗率: < 1%

---

### 3. TTL 與定期清理驗證

**優先級**: Medium  
**範圍**:
- MongoDB TTL index 運作驗證
- Cron Job 定期清理實作
- 過期通知統計監控

---

## Risk Assessment

### High Risk 
- **Socket.IO 容錯**: 未測試斷線重連，生產環境可能失效
- **負載測試缺失**: 無法保證大量用戶下的效能

### Medium Risk 
- **TTL 清理**: 未驗證自動清理機制，可能累積過期資料

### Low Risk 
- **核心功能**: 所有 API 與通知觸發已完整測試
- **前端整合**: NotificationBell 與 Page 功能正常

---

## Integration with Test Suite

### 現有測試覆蓋

**P0 Integration Tests** (`test-integration.js`)
-  通知 CRUD API (6 個端點)
-  通知觸發整合 (留言/回覆/按讚/認養/訊息)
-  未讀數量邏輯
-  標記已讀/刪除功能

**Manual Tests** (`test-notifications.js`)
-  通知建立流程
-  資料格式驗證
-  優先級設定

**Test Execution**: 12/12 passing (100%) - **但缺少效能與容錯測試**

---

### 建議新增測試

1. **Socket.IO 整合測試** (優先級: High)
2. **負載與效能測試** (優先級: High)
3. **TTL 驗證測試** (優先級: Medium)

---

## Conclusion

Story 3.1 的需求追溯顯示：

-  **功能需求 91.7% 測試覆蓋**
-  **效能需求 0% 測試覆蓋** (Critical)
-  **容錯機制未測試** (High Risk)
-  **核心通知功能完整且穩定**

**Quality Gate Recommendation**: **PASS with CONCERNS**

**關鍵問題**:
1. Socket.IO 容錯機制未驗證  **必須在生產部署前完成**
2. 負載測試完全缺失  **必須建立效能基準**
3. TTL 清理未驗證  **建議盡快實作**

**建議行動**:
-  **可以部署到測試環境**進行用戶驗收
-  **不建議直接上線生產**，需先完成 Socket.IO 容錯測試
-  **並行進行負載測試**，建立效能基準

---

**Trace Matrix Date**: 2025-11-26  
**Next Review**: 完成 Socket.IO 容錯測試後
**Production Readiness**: 需完成建議測試項目
