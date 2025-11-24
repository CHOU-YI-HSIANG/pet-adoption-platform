import React from 'react';

/**
 * ErrorFallback 元件
 * 用於顯示錯誤訊息的友善介面
 * 
 * @param {Object} props
 * @param {Error} props.error - 錯誤物件
 * @param {Function} props.resetErrorBoundary - 重置錯誤邊界的函數
 */
function ErrorFallback({ error, resetErrorBoundary }) {
  const handleGoHome = () => {
    try {
      window.location.href = '/';
    } catch (e) {
      // fallback
      window.location.assign('/');
    }
    resetErrorBoundary();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        {/* 錯誤圖示 */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* 錯誤標題 */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
          糟糕!頁面出現問題了
        </h1>

        {/* 錯誤說明 */}
        <p className="text-gray-600 text-center mb-6">
          很抱歉,頁面遇到了一些技術問題。我們已經記錄了這個錯誤,會盡快修復。
        </p>

        {/* 錯誤詳情 (僅開發環境顯示) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-800 mb-2">
              錯誤詳情 (僅開發環境顯示):
            </p>
            <p className="text-sm text-red-700 font-mono break-all">
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-sm text-red-700 cursor-pointer hover:text-red-800">
                  查看完整堆疊追蹤
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg
              className="inline-block w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            重新整理頁面
          </button>

          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg
              className="inline-block w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            回到首頁
          </button>
        </div>

        {/* 建議操作 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">
            您可以嘗試:
          </p>
          <ul className="text-sm text-gray-600 space-y-2 max-w-md mx-auto">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>重新整理頁面</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>清除瀏覽器快取後重試</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>如果問題持續,請聯繫我們的支援團隊</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ErrorFallback;
