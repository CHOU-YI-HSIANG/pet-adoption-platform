import React, { useState } from 'react';

/**
 * 錯誤測試頁面
 * 僅用於開發環境測試 ErrorBoundary
 * 生產環境應該移除此頁面或加上環境檢查
 */
function ErrorTestPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    // 故意拋出錯誤來測試 ErrorBoundary
    throw new Error('這是一個測試錯誤,用於驗證 ErrorBoundary 是否正常運作');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            錯誤邊界測試頁面
          </h1>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>警告:</strong> 此頁面僅用於測試目的。點擊下方按鈕將觸發錯誤。
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-6">
            這個頁面用於測試 React Error Boundary 的功能。
            點擊下方按鈕將會故意拋出一個錯誤,讓您看到錯誤邊界的友善錯誤訊息。
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setShouldThrow(true)}
              className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              觸發錯誤 (測試 ErrorBoundary)
            </button>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                預期行為:
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>點擊按鈕後,頁面會顯示友善的錯誤訊息</li>
                <li>開發環境下會顯示錯誤詳情</li>
                <li>有「重新整理」和「回到首頁」按鈕</li>
                <li>錯誤會被記錄到 console</li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                開發提示:
              </h3>
              <p className="text-sm text-blue-800">
                生產環境中應該移除或隱藏此測試頁面。
                可以透過環境變數來控制此頁面的可見性。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorTestPage;
