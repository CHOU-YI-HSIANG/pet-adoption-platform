import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../services/auth';
import { Heart, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await registerUser(data);
      if (result.success) {
        // 註冊成功後跳轉到使用者儀表板
        navigate('/dashboard');
      } else {
        // 根據錯誤類型設置相應的錯誤消息
        if (result.error.includes('email') || result.error.includes('電子郵件') || result.error.includes('Email')) {
          setError('email', { message: result.error });
        } else if (result.error.includes('username') || result.error.includes('使用者名稱') || result.error.includes('Username')) {
          setError('username', { message: result.error });
        } else {
          setError('email', { message: result.error });
        }
      }
    } catch (error) {
      setError('email', { message: '註冊時發生錯誤，請稍後再試' });
    } finally {
      setIsLoading(false);
    }
  };

  const cities = [
    '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
    '新竹縣', '新竹市', '苗栗縣', '彰化縣', '南投縣', '雲林縣',
    '嘉義縣', '嘉義市', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣',
    '澎湖縣', '金門縣', '連江縣'
  ];

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
          建立您的帳號
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          已經有帳號了嗎？{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            立即登入
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* 使用者名稱 */}
            <div>
              <label htmlFor="username" className="form-label">
                使用者名稱
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  className={`input-field ${errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  {...register('username', {
                    required: '請輸入使用者名稱',
                    minLength: {
                      value: 3,
                      message: '使用者名稱至少需要 3 個字元',
                    },
                    maxLength: {
                      value: 30,
                      message: '使用者名稱不能超過 30 個字元',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: '使用者名稱只能包含英文字母、數字和底線',
                    },
                  })}
                />
                {errors.username && (
                  <p className="form-error">{errors.username.message}</p>
                )}
              </div>
            </div>

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

            {/* 姓名 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="form-label">
                  姓氏
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="family-name"
                    className={`input-field ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    {...register('firstName', {
                      required: '請輸入姓氏',
                      maxLength: {
                        value: 20,
                        message: '姓氏不能超過 20 個字元',
                      },
                    })}
                  />
                  {errors.firstName && (
                    <p className="form-error">{errors.firstName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="form-label">
                  名字
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="given-name"
                    className={`input-field ${errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    {...register('lastName', {
                      required: '請輸入名字',
                      maxLength: {
                        value: 20,
                        message: '名字不能超過 20 個字元',
                      },
                    })}
                  />
                  {errors.lastName && (
                    <p className="form-error">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 電話號碼 */}
            <div>
              <label htmlFor="phone" className="form-label">
                電話號碼
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="09xxxxxxxx"
                  className={`input-field ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  {...register('phone', {
                    required: '請輸入電話號碼',
                    pattern: {
                      value: /^09\d{8}$/,
                      message: '請輸入有效的台灣手機號碼格式 (09xxxxxxxx)',
                    },
                  })}
                />
                {errors.phone && (
                  <p className="form-error">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* 地址 */}
            <div>
              <label className="form-label">地址</label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <select
                      className={`input-field ${errors['address.city'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      {...register('address.city', {
                        required: '請選擇城市',
                      })}
                    >
                      <option value="">選擇城市</option>
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    {errors['address.city'] && (
                      <p className="form-error">{errors['address.city'].message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="區域"
                      className={`input-field ${errors['address.district'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      {...register('address.district', {
                        required: '請輸入區域',
                      })}
                    />
                    {errors['address.district'] && (
                      <p className="form-error">{errors['address.district'].message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="街道地址"
                    className={`input-field ${errors['address.street'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    {...register('address.street', {
                      required: '請輸入街道地址',
                    })}
                  />
                  {errors['address.street'] && (
                    <p className="form-error">{errors['address.street'].message}</p>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="郵遞區號（選填）"
                    className={`input-field ${errors['address.zipCode'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    {...register('address.zipCode', {
                      pattern: {
                        value: /^\d{3}(\d{2})?$/,
                        message: '請輸入有效的郵遞區號',
                      },
                    })}
                  />
                  {errors['address.zipCode'] && (
                    <p className="form-error">{errors['address.zipCode'].message}</p>
                  )}
                </div>
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
                  autoComplete="new-password"
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

            {/* 確認密碼 */}
            <div>
              <label htmlFor="confirmPassword" className="form-label">
                確認密碼
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  {...register('confirmPassword', {
                    required: '請確認密碼',
                    validate: (value) => value === password || '密碼不一致',
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.confirmPassword && (
                  <p className="form-error">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* 服務條款 */}
            <div className="flex items-center">
              <input
                id="agree-terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                {...register('agreeTerms', {
                  required: '請同意服務條款和隱私政策',
                })}
              />
              <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
                我同意{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  服務條款
                </a>{' '}
                和{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  隱私政策
                </a>
              </label>
            </div>
            {errors.agreeTerms && (
              <p className="form-error">{errors.agreeTerms.message}</p>
            )}

            {/* 註冊按鈕 */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex justify-center items-center py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    註冊中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="-ml-1 mr-3 h-5 w-5" />
                    建立帳號
                  </>
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

          {/* Google 註冊 */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                window.location.href = 'http://localhost:5000/api/auth/google';
              }}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              使用 Google 帳號註冊
            </button>
          </div>

          {/* 註冊好處 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">註冊會員的好處：</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 提交動物認養申請</li>
              <li>• 追蹤申請進度</li>
              <li>• 收藏心儀的毛小孩</li>
              <li>• 接收最新認養資訊</li>
            </ul>
          </div>
        </div>

        {/* 幫助資訊 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            註冊過程中遇到問題？{' '}
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

export default RegisterPage;