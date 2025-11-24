import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from 'lucide-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      // 處理錯誤
      console.error('Google 認證失敗:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      // 儲存 token
      localStorage.setItem('token', token);
      
      // 重定向到首頁
      navigate('/');
      
      // 刷新頁面以更新認證狀態
      window.location.reload();
    } else {
      // 沒有 token,重定向到登入頁
      navigate('/login');
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <Loader className="w-12 h-12 text-primary-600 animate-spin mb-4" />
      <p className="text-lg text-gray-700">正在處理 Google 登入...</p>
      <p className="text-sm text-gray-500 mt-2">請稍候</p>
    </div>
  );
};

export default AuthCallbackPage;