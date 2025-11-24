import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './services/auth';
import { SocketProvider } from './services/socket';

// 導入頁面組件
import HomePage from './pages/HomePage';
import PetsPage from './pages/PetsPage';
import PetDetailPage from './pages/PetDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import AdoptionApplicationPage from './pages/AdoptionApplicationPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ErrorTestPage from './pages/ErrorTestPage';
import CommunityPage from './pages/CommunityPage';
import CreatePostPage from './pages/CreatePostPage';
import LostPetsPage from './pages/LostPetsPage';
import PostDetailPage from './pages/PostDetailPage';
import MessagesPage from './pages/MessagesPage';
import ConversationPage from './pages/ConversationPage';
import NotificationsPage from './pages/NotificationsPage';
import UserDashboardPage from './pages/UserDashboardPage';
import ShelterDashboardPage from './pages/ShelterDashboardPage';
import PetEditPage from './pages/PetEditPage'; // Story 3.6: 寵物編輯頁面
import ResourcesPage from './pages/ResourcesPage'; // 資源整合頁面
import DataImportPage from './pages/DataImportPage'; // 政府資料匯入頁面
import CreatePetPage from './pages/CreatePetPage'; // 用戶發布送養動物頁面
import MyPetsApplicationsPage from './pages/MyPetsApplicationsPage'; // 送養者管理申請頁面
import MyPetsPage from './pages/MyPetsPage'; // 我的送養動物列表頁面
import EditPetPage from './pages/EditPetPage'; // 編輯送養動物頁面

// 導入布局組件
import Layout from './components/Layout';
import ErrorFallback from './components/ErrorFallback';

function App() {
  // 錯誤處理函數
  const handleError = (error, errorInfo) => {
    // 記錄錯誤到 console (開發環境)
    console.error('React Error Boundary 捕獲錯誤:', error, errorInfo);
    
    // 可選: 發送錯誤日誌到後端
    // 生產環境中應該發送到錯誤追蹤服務 (如 Sentry)
    if (process.env.NODE_ENV === 'production') {
      // 這裡可以實作發送錯誤到後端的邏輯
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     error: error.toString(),
      //     errorInfo: errorInfo.componentStack,
      //     timestamp: new Date().toISOString()
      //   })
      // }).catch(err => console.error('無法發送錯誤日誌:', err));
    }
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // 重置應用狀態 (如果需要)
        window.location.href = '/';
      }}
    >
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* 公開路由 */}
                <Route path="/" element={<Layout><HomePage /></Layout>} />
                <Route path="/pets" element={<Layout><PetsPage /></Layout>} />
                <Route path="/pets/create" element={<Layout><CreatePetPage /></Layout>} />
                <Route path="/pets/:id" element={<Layout><PetDetailPage /></Layout>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/community" element={<Layout><CommunityPage /></Layout>} />
                <Route path="/community/create" element={<Layout><CreatePostPage /></Layout>} />
                <Route path="/community/:id" element={<Layout><PostDetailPage /></Layout>} />
                <Route path="/lost-pets" element={<Layout><LostPetsPage /></Layout>} />
                <Route path="/resources" element={<Layout><ResourcesPage /></Layout>} />
                <Route path="/messages" element={<Layout><MessagesPage /></Layout>} />
                <Route path="/messages/:userId" element={<Layout><ConversationPage /></Layout>} />
                <Route path="/notifications" element={<Layout><NotificationsPage /></Layout>} />
                
                {/* 測試路由 (僅開發環境) */}
                {process.env.NODE_ENV === 'development' && (
                  <Route path="/error-test" element={<Layout><ErrorTestPage /></Layout>} />
                )}
                
                {/* 需要認證的路由 */}
                <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
                <Route path="/dashboard" element={<Layout><UserDashboardPage /></Layout>} />
                <Route path="/shelter/dashboard" element={<Layout><ShelterDashboardPage /></Layout>} />
                <Route path="/shelter/pets/:id/edit" element={<Layout><PetEditPage /></Layout>} /> {/* Story 3.6: 寵物編輯 */}
                <Route path="/shelter/data-import" element={<Layout><DataImportPage /></Layout>} /> {/* 政府資料匯入 */}
                <Route path="/adopt/:petId" element={<Layout><AdoptionApplicationPage /></Layout>} />
                <Route path="/my-applications" element={<Layout><MyApplicationsPage /></Layout>} />
                <Route path="/my-pets-applications" element={<Layout><MyPetsApplicationsPage /></Layout>} /> {/* 送養者管理申請 */}
                <Route path="/my-pets" element={<Layout><MyPetsPage /></Layout>} /> {/* 我的送養列表 */}
                <Route path="/pets/:id/edit" element={<Layout><EditPetPage /></Layout>} /> {/* 編輯送養動物 */}
                
                {/* 重定向根路徑到首頁 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            
            {/* Toast 通知系統 */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;