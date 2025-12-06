import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { 
  Heart, 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  FileText,
  Home,
  Search,
  BarChart3,
  MessageCircle,
  Heart as HeartIcon,
  Database,
  Mail
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigation = [
    { name: '首頁', href: '/', icon: Home },
    { name: '尋找毛小孩', href: '/pets', icon: Search },
    { name: '發布送養', href: '/pets/create', icon: HeartIcon }, 
    { name: '社群留言板', href: '/community', icon: MessageCircle },
    { name: '資源整合', href: '/resources', icon: HeartIcon },
  ];

  const userNavigation = isAuthenticated
    ? [
        ...(user?.role === 'shelter' || user?.role === 'admin'
          ? [
              { name: '收容所儀表板', href: '/shelter/dashboard', icon: BarChart3 },
              { name: '資料匯入', href: '/shelter/data-import', icon: Database }
            ]
          : [{ name: '我的儀表板', href: '/dashboard', icon: BarChart3 }]),
        { name: '個人資料', href: '/profile', icon: User },
        { name: '訊息中心', href: '/messages', icon: Mail },
        { name: '我的申請', href: '/my-applications', icon: FileText },
        { name: '我的送養', href: '/my-pets', icon: HeartIcon },
        { name: '收到的申請', href: '/my-pets-applications', icon: FileText },
      ]
    : [];

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    // 精確匹配路徑，避免 /pets 匹配到 /pets/create
    if (path === '/pets') {
      return location.pathname === '/pets' || location.pathname.startsWith('/pets?');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 導航欄 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo 和主導航 */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Heart className="h-8 w-8 text-primary-600" />
                <span className="font-bold text-xl text-gray-900">
                  愛心認養平台
                </span>
              </Link>

              {/* 桌面版導航 */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        isActivePath(item.href)
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 右側按鈕 */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* 通知鈴鐺 */}
                  <NotificationBell />
                  
                  <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
                  >
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="hidden md:block">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </button>

                  {/* 使用者下拉選單 */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      {userNavigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon className="w-4 h-4 mr-3" />
                            {item.name}
                          </Link>
                        );
                      })}
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        登出
                      </button>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                  >
                    登入
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm"
                  >
                    註冊
                  </Link>
                </div>
              )}

              {/* 手機版選單按鈕 */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* 手機版導航選單 */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center pl-3 pr-4 py-2 text-base font-medium border-l-4 transition-colors duration-200 ${
                      isActivePath(item.href)
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}

              {isAuthenticated && (
                <>
                  <hr className="my-2" />
                  {userNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center pl-3 pr-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center pl-3 pr-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    登出
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* 主要內容 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 頁腳 */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 平台資訊 */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-8 w-8 text-primary-400" />
                <span className="font-bold text-xl">愛心認養平台</span>
              </div>
              <p className="text-gray-300 mb-4">
                我們致力於為無家可歸的毛小孩找到溫暖的家，
                讓每一個生命都能被愛與關懷。
              </p>
              <p className="text-gray-400 text-sm">
                © 2024 愛心動物認養平台. 保留所有權利.
              </p>
            </div>

            {/* 快速連結 */}
            <div>
              <h3 className="font-semibold mb-4">快速連結</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/pets" className="text-gray-300 hover:text-white transition-colors">
                    瀏覽動物
                  </Link>
                </li>
                {isAuthenticated && (
                  <li>
                    <Link to="/my-applications" className="text-gray-300 hover:text-white transition-colors">
                      我的申請
                    </Link>
                  </li>
                )}
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">
                    認養流程
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">
                    聯絡我們
                  </a>
                </li>
              </ul>
            </div>

            {/* 聯絡資訊 */}
            <div>
              <h3 className="font-semibold mb-4">聯絡資訊</h3>
              <ul className="space-y-2 text-gray-300">
                <li>電話: (02) 1234-5678</li>
                <li>信箱: admin@petadoption.com</li>
                <li>地址: 320桃園市中壢區中大路300號</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* 點擊外部關閉下拉選單 */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMobileMenuOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Layout;