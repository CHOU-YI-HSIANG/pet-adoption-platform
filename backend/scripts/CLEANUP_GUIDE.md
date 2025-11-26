# 定期清理已刪除貼文說明

## 功能概述

此系統實作了軟刪除機制與定期清理功能，平衡資料恢復需求與資料庫效能。

## 工作原理

### 1. 軟刪除（Soft Delete）
- 當用戶刪除貼文時，不會立即從資料庫移除
- 只將 `status` 設為 `'deleted'` 並記錄 `deletedAt` 時間戳記
- 保留期間可恢復誤刪的資料

### 2. 定期清理（Cleanup）
- 永久刪除超過指定天數（預設 90 天）的軟刪除貼文
- 同時清理相關留言，避免孤立資料
- 可手動執行或設定為自動化任務

## 使用方式

### 手動清理

```bash
# 清理 90 天前刪除的貼文（預設）
node scripts/cleanup-deleted-posts.js

# 清理 30 天前刪除的貼文
node scripts/cleanup-deleted-posts.js --days=30

# 模擬執行（不實際刪除，用於測試）
node scripts/cleanup-deleted-posts.js --dry-run

# 自訂天數 + 模擬執行
node scripts/cleanup-deleted-posts.js --days=60 --dry-run
```

### 自動化排程

#### Windows (使用工作排程器)

1. 開啟「工作排程器」
2. 建立基本工作
3. 設定觸發程序：每月第一天 02:00
4. 動作：啟動程式
   - 程式：`node`
   - 引數：`C:\完整路徑\scripts\cleanup-deleted-posts.js`
   - 開始位置：`C:\完整路徑\backend`

#### Linux/Mac (使用 cron)

```bash
# 編輯 crontab
crontab -e

# 加入以下行（每月 1 號凌晨 2 點執行）
0 2 1 * * cd /path/to/backend && node scripts/cleanup-deleted-posts.js >> logs/cleanup.log 2>&1
```

## 資料庫修改

### Post Model 新增欄位

```javascript
deletedAt: {
  type: Date,
  default: null
}
```

### 索引建議

```javascript
// 加速查詢已刪除的貼文
postSchema.index({ status: 1, deletedAt: 1 });
```

## 清理流程

1. **查詢符合條件的貼文**
   - status = 'deleted'
   - deletedAt < (今天 - N 天)

2. **刪除相關留言**
   - 避免孤立的留言資料

3. **永久刪除貼文**
   - 使用 `deleteMany()` 真正從資料庫移除

4. **輸出統計報告**
   - 刪除的貼文數
   - 刪除的留言數

## 建議設定

### 保留期限

- **一般使用**：90 天（3 個月）
- **頻繁刪除**：30 天（1 個月）
- **長期保留**：180 天（6 個月）

### 執行頻率

- **每月執行**：適合大多數情況
- **每週執行**：資料量大且刪除頻繁時
- **每季執行**：資料量小且刪除少時

## 監控與維護

### 查詢待清理貼文數量

```javascript
// 查詢超過 90 天的軟刪除貼文
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

const count = await Post.countDocuments({
  status: 'deleted',
  deletedAt: { $lt: cutoffDate, $ne: null }
});

console.log(`待清理貼文數：${count}`);
```

### 資料庫空間監控

```javascript
// MongoDB 查看集合大小
db.posts.stats()
```

## 安全性考量

1. **備份**：執行清理前建議先備份資料庫
2. **模擬執行**：首次使用建議先用 `--dry-run` 測試
3. **日誌記錄**：將清理結果輸出到日誌檔案
4. **通知機制**：清理完成後可發送通知給管理員

## 恢復誤刪資料

如果需要恢復軟刪除的貼文（在清理前）：

```javascript
// 恢復單篇貼文
await Post.findByIdAndUpdate(postId, {
  status: 'published',
  deletedAt: null
});

// 批次恢復
await Post.updateMany(
  { status: 'deleted', deletedAt: { $gte:某個日期 } },
  { status: 'published', deletedAt: null }
);
```

## 效能影響

### 優點
- 減少資料庫膨脹
- 改善查詢效能
- 降低備份成本

### 缺點
- 清理過程會占用資源（建議離峰時段執行）
- 無法恢復已清理的資料

## 常見問題

**Q: 如何修改預設保留天數？**
A: 執行時加上 `--days=N` 參數，或修改腳本中的預設值。

**Q: 清理會影響線上服務嗎？**
A: 建議在離峰時段執行，對少量資料影響不大。

**Q: 如何查看清理歷史記錄？**
A: 將執行結果導向日誌檔案：`node script.js >> logs/cleanup.log 2>&1`

**Q: 可以只清理留言嗎？**
A: 需要另外建立清理留言的腳本，邏輯類似。

## 進階功能擴展

未來可考慮：
- 管理員後台 UI 操作介面
- 清理前發送通知給管理員
- 清理統計儀表板
- 自動偵測並建議清理
- 分批清理避免一次性刪除太多資料
