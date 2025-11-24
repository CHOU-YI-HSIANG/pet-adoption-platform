import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const googleButtonRef = useRef(null);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 確保 Google Identity Services 已載入
    if (!window.google) {
      console.error('Google Identity Services not loaded');
      return;
    }

    // 初始化 Google One Tap
    try {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '您的 Google Client ID',
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // 渲染登入按鈕
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          }
        );
      }

      // 顯示 One Tap 提示（可選）
      // window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Google 登入初始化失敗:', error);
    }
  }, []);

  const handleGoogleCallback = async (response) => {
    try {
      const result = await loginWithGoogle(response.credential);
      
      if (result.success) {
        if (onSuccess) {
          onSuccess(result);
        } else {
          // 預設行為：重定向到 dashboard
          const userData = JSON.parse(localStorage.getItem('user'));
          if (userData?.role === 'shelter' || userData?.role === 'admin') {
            navigate('/shelter/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        if (onError) {
          onError(result.error);
        }
      }
    } catch (error) {
      console.error('Google 登入處理失敗:', error);
      if (onError) {
        onError(error.message || 'Google 登入失敗');
      }
    }
  };

  return (
    <div className="w-full">
      <div ref={googleButtonRef} className="w-full"></div>
    </div>
  );
};

export default GoogleLoginButton;
