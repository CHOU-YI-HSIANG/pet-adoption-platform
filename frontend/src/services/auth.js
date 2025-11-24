import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// 建立認證上下文
const AuthContext = createContext();

// 認證提供者組件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 檢查本地存儲中的認證狀態
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          // 直接使用本地存儲的用戶資料，不驗證 token
          // 這樣可以避免頁面載入時的不必要請求
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setIsAuthenticated(true);
          } catch (parseError) {
            console.warn('解析用戶資料失敗:', parseError);
            // 如果解析失敗，清除無效資料
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('認證檢查失敗:', error);
        // 不清除 token，讓使用者繼續使用
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Google 登入函數
  const loginWithGoogle = async (credential) => {
    try {
      const response = await authAPI.googleLogin(credential);
      const { token, user: userData } = response.data;

      // 保存到本地存儲
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // 更新狀態
      setUser(userData);
      setIsAuthenticated(true);

      toast.success('Google 登入成功！');
      return { success: true };
    } catch (error) {
      console.error('Google 登入錯誤:', error.response?.data);
      const message = error.response?.data?.error || 'Google 登入失敗';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // 登入函數
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData } = response.data;

      // 保存到本地存儲
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // 更新狀態
      setUser(userData);
      setIsAuthenticated(true);

      toast.success('登入成功！');
      return { success: true };
    } catch (error) {
      console.error('登入錯誤:', error.response?.data);
      
      // 處理不同格式的錯誤訊息
      let message = '登入失敗';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // 如果有 error 欄位
        if (errorData.error) {
          // error 是字串
          if (typeof errorData.error === 'string') {
            message = errorData.error;
          }
          // error 是物件（Joi 驗證錯誤格式）
          else if (typeof errorData.error === 'object') {
            // 顯示主要錯誤訊息
            if (errorData.error.message) {
              message = errorData.error.message;
            }
            // 如果有詳細錯誤，取第一個欄位的錯誤訊息
            if (Array.isArray(errorData.error.details) && errorData.error.details.length > 0) {
              message = errorData.error.details[0].message;
            }
          }
        }
        // 如果有 details 欄位（字串）
        else if (typeof errorData.details === 'string') {
          message = errorData.details;
        }
        // 如果有 message 欄位
        else if (errorData.message) {
          message = errorData.message;
        }
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // 註冊函數
  const register = async (userData) => {
    try {
      // 組合 name 欄位
      const registrationData = {
        ...userData,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      };
      
      const response = await authAPI.register(registrationData);
      const { token, user: newUser } = response.data;

      // 保存到本地存儲
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));

      // 更新狀態
      setUser(newUser);
      setIsAuthenticated(true);

      toast.success('註冊成功！歡迎加入愛心認養平台！');
      return { success: true };
    } catch (error) {
      console.error('註冊錯誤:', error.response?.data);
      
      // 處理不同格式的錯誤訊息
      let message = '註冊失敗';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // 如果有 error 欄位
        if (errorData.error) {
          // error 是字串
          if (typeof errorData.error === 'string') {
            message = errorData.error;
          }
          // error 是物件（Joi 驗證錯誤格式）
          else if (typeof errorData.error === 'object') {
            // 顯示主要錯誤訊息
            if (errorData.error.message) {
              message = errorData.error.message;
            }
            // 如果有詳細錯誤，取第一個欄位的錯誤訊息
            if (Array.isArray(errorData.error.details) && errorData.error.details.length > 0) {
              message = errorData.error.details[0].message;
            }
          }
        }
        // 如果有 details 欄位（字串）
        else if (typeof errorData.details === 'string') {
          message = errorData.details;
        }
        // 如果有 message 欄位
        else if (errorData.message) {
          message = errorData.message;
        }
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // 登出函數
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('已成功登出');
  };

  // 更新個人資料
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = response.data.user;

      // 更新本地存儲和狀態
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success('個人資料更新成功！');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || '更新個人資料失敗';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // 變更密碼
  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      toast.success('密碼變更成功！');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || '密碼變更失敗';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // 檢查是否為管理員
  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'volunteer');
  };

  // 檢查是否為超級管理員
  const isSuperAdmin = () => {
    return user && user.role === 'admin';
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    changePassword,
    isAdmin,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 使用認證的 Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必須在 AuthProvider 內使用');
  }
  return context;
};

// 保護路由的高階組件
export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 重定向到登入頁面
    window.location.href = '/login';
    return null;
  }

  if (requireAdmin && !isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">權限不足</h2>
          <p className="text-gray-600">您沒有權限訪問此頁面</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthContext;