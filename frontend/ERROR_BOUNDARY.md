# React Error Boundary 使用指南

## 概述

本專案使用 `react-error-boundary` 套件來捕獲和處理 React 元件錯誤,提供友善的錯誤提示UI,避免整個應用程式崩潰。

## 套件資訊

- **套件**: react-error-boundary
- **版本**: 已安裝在 package.json
- **文件**: https://github.com/bvaughn/react-error-boundary

## 架構

### 1. ErrorFallback 元件 (`src/components/ErrorFallback.js`)

友善的錯誤 UI 元件,當錯誤發生時顯示給使用者。

**功能**:
- 🎨 美觀的錯誤提示界面
- 🔄 「重新整理頁面」按鈕
- 🏠 「回到首頁」按鈕
- 🐛 開發環境顯示錯誤詳情
- 💡 建議操作提示

**設計特點**:
- Tailwind CSS 樣式
- 響應式設計 (支援手機/平板/桌面)
- 漸層背景
- 清晰的視覺層次

### 2. App.js 整合

應用程式最外層包裹 ErrorBoundary,捕獲所有子元件的錯誤。

```javascript
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from './components/ErrorFallback';

function App() {
  const handleError = (error, errorInfo) => {
    console.error('錯誤捕獲:', error, errorInfo);
    // 可選: 發送到錯誤追蹤服務
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.href = '/'}
    >
      {/* 應用程式內容 */}
    </ErrorBoundary>
  );
}
```

### 3. 測試頁面 (`src/pages/ErrorTestPage.js`)

僅開發環境可用的測試頁面,用於驗證 ErrorBoundary 是否正常運作。

**訪問路徑**: `/error-test` (僅開發環境)

## 使用方式

### 全域錯誤邊界 (已實作)

App.js 中的最外層 ErrorBoundary 會捕獲所有未處理的錯誤。

### 局部錯誤邊界 (可選)

如果需要為特定頁面或元件設置獨立的錯誤邊界:

```javascript
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '../components/ErrorFallback';

function MyPage() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('MyPage 錯誤:', error);
      }}
    >
      <MyPageContent />
    </ErrorBoundary>
  );
}
```

### 自訂錯誤 Fallback (可選)

為特定元件建立自訂的錯誤 UI:

```javascript
function CustomErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-4 bg-red-50 rounded">
      <h2>此區塊發生錯誤</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>重試</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={CustomErrorFallback}>
  <RiskyComponent />
</ErrorBoundary>
```

## 錯誤處理最佳實踐

### 1. 錯誤日誌

目前錯誤會記錄到 console。生產環境應該整合錯誤追蹤服務:

```javascript
const handleError = (error, errorInfo) => {
  console.error('錯誤捕獲:', error, errorInfo);
  
  if (process.env.NODE_ENV === 'production') {
    // 發送到錯誤追蹤服務 (如 Sentry)
    // Sentry.captureException(error, { extra: errorInfo });
    
    // 或發送到自己的後端
    // fetch('/api/errors', {
    //   method: 'POST',
    //   body: JSON.stringify({ error, errorInfo })
    // });
  }
};
```

### 2. 錯誤邊界的限制

ErrorBoundary **無法**捕獲以下錯誤:
- ❌ 事件處理器中的錯誤
- ❌ 非同步程式碼 (setTimeout, Promise)
- ❌ 伺服器端渲染錯誤
- ❌ ErrorBoundary 自身的錯誤

這些錯誤需要使用 try-catch 處理:

```javascript
// 事件處理器
const handleClick = async () => {
  try {
    await fetchData();
  } catch (error) {
    console.error('獲取資料失敗:', error);
    toast.error('操作失敗,請稍後再試');
  }
};

// 非同步操作
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await api.getData();
      setData(data);
    } catch (error) {
      console.error('載入失敗:', error);
      setError(error);
    }
  };
  loadData();
}, []);
```

### 3. 優雅降級

為關鍵功能提供備用方案:

```javascript
function MyComponent() {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <SimpleFallback />;
  }

  return (
    <ErrorBoundary
      onError={() => setHasError(true)}
      FallbackComponent={ErrorFallback}
    >
      <ComplexFeature />
    </ErrorBoundary>
  );
}
```

## 測試

### 單元測試

```bash
npm test -- ErrorFallback.test.js
```

### 手動測試

1. 啟動開發伺服器: `npm start`
2. 訪問測試頁面: http://localhost:3000/error-test
3. 點擊「觸發錯誤」按鈕
4. 驗證 ErrorFallback 顯示正確
5. 測試「重新整理」和「回到首頁」按鈕

## 開發環境 vs 生產環境

### 開發環境
- ✅ 顯示完整錯誤訊息
- ✅ 顯示堆疊追蹤
- ✅ 測試頁面可用
- ✅ Console 詳細日誌

### 生產環境
- ✅ 僅顯示友善錯誤訊息
- ❌ 不顯示技術細節
- ❌ 測試頁面不可用
- ✅ 錯誤發送到追蹤服務

## 常見問題

### Q: 為什麼有些錯誤沒被捕獲?

A: ErrorBoundary 只能捕獲渲染期間的錯誤。事件處理器和非同步程式碼需要使用 try-catch。

### Q: 如何測試 ErrorBoundary?

A: 使用 `/error-test` 頁面,或在任何元件中故意拋出錯誤:

```javascript
if (someCondition) {
  throw new Error('測試錯誤');
}
```

### Q: 錯誤後如何恢復?

A: ErrorBoundary 提供 `resetErrorBoundary` 函數,可以重置錯誤狀態。ErrorFallback 的「重新整理」按鈕會呼叫此函數。

### Q: 可以在 ErrorBoundary 中使用 hooks 嗎?

A: `ErrorBoundary` 本身不能使用 hooks (它是 class component),但 `ErrorFallback` 元件可以使用 hooks。

## 未來改進

- [ ] 整合 Sentry 或其他錯誤追蹤服務
- [ ] 實作錯誤報告 API
- [ ] 添加錯誤分類和優先級
- [ ] 實作錯誤重試機制
- [ ] 添加離線錯誤佇列
- [ ] 錯誤趨勢分析

## 相關資源

- [React 官方文檔 - Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [react-error-boundary GitHub](https://github.com/bvaughn/react-error-boundary)
- [Sentry for React](https://docs.sentry.io/platforms/javascript/guides/react/)

## 聯繫與支援

如果 ErrorBoundary 相關問題,請聯繫開發團隊。
