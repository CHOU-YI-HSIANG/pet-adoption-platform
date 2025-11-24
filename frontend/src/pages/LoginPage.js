import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../services/auth';
import { Heart, Eye, EyeOff, Loader } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data);
      if (result.success) {
        // 檢查是否有重定向的目標頁面
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        
        if (redirectParam) {
          navigate(redirectParam);
        } else {
          // 根據使用者角色重定向到對應的儀表板
          const userData = JSON.parse(localStorage.getItem('user'));
          if (userData?.role === 'shelter' || userData?.role === 'admin') {
            navigate('/shelter/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        setError('email', { message: result.error });
      }
    } catch (error) {
      setError('email', { message: '登入時發生錯誤，請稍後再試' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center space-x-2">
            <Heart className="h-10 w-10 text-primary-600" />
            <span className="font-bold text-2xl text-gray-900">愛心認養平台</span>
          </Link>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          登入您的帳號
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          還沒有帳號嗎？{' '}
          <Link
            to="/register"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            立即註冊
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* 電子郵件 */}
            <div>
              <label htmlFor="email" className="form-label">
                電子郵件
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input-field ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  {...register('email', {
                    required: '請輸入電子郵件',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: '請輸入有效的電子郵件格式',
                    },
                  })}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* 密碼 */}
            <div>
              <label htmlFor="password" className="form-label">
                密碼
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input-field pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  {...register('password', {
                    required: '請輸入密碼',
                    minLength: {
                      value: 6,
                      message: '密碼至少需要 6 個字元',
                    },
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* 記住我 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  記住我
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => alert('忘記密碼功能開發中，請聯繫系統管理員重設密碼')}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  忘記密碼？
                </button>
              </div>
            </div>

            {/* 登入按鈕 */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex justify-center items-center py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    登入中...
                  </>
                ) : (
                  '登入'
                )}
              </button>
            </div>
          </form>

          {/* 分隔線 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>
          </div>

          {/* Google 登入按鈕 */}
          <div className="mt-6">
            <GoogleLoginButton
              onSuccess={(result) => {
                // 檢查是否有重定向的目標頁面
                const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                
                if (redirectParam) {
                  navigate(redirectParam);
                } else {
                  // 根據使用者角色重定向到對應的儀表板
                  const userData = JSON.parse(localStorage.getItem('user'));
                  if (userData?.role === 'shelter' || userData?.role === 'admin') {
                    navigate('/shelter/dashboard');
                  } else {
                    navigate('/dashboard');
                  }
                }
              }}
              onError={(error) => {
                setError('email', { message: error });
              }}
            />
          </div>

          {/* 快速訪問 */}
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600 mb-4">
              想要快速體驗平台功能？
            </p>
            <Link
              to="/pets"
              className="w-full btn-secondary flex justify-center items-center py-2"
            >
              以訪客身份瀏覽動物
            </Link>
          </div>
        </div>

        {/* 幫助資訊 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            需要幫助？{' '}
            <a
              href="mailto:admin@petadoption.com"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              聯絡客服
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;