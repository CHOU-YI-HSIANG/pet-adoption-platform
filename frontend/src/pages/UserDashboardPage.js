import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import {
  TrendingUp,
  Heart,
  MessageSquare,
  FileText,
  Eye,
  Calendar,
  Award,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';

const UserDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 取得使用者統計資料
  const { data: stats, isLoading } = useQuery(
    'userStats',
    async () => {
      const response = await fetch('http://localhost:5000/api/users/me/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    {
      select: (response) => response.data
    }
  );

  // 取得活動時間軸
  const { data: activities, isLoading: activitiesLoading } = useQuery(
    'userActivities',
    async () => {
      const response = await fetch('http://localhost:5000/api/users/me/activities?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    {
      select: (response) => response.data
    }
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: '瀏覽寵物',
      value: stats?.petsViewed || 0,
      icon: <Eye className="w-6 h-6" />,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: '我的收藏',
      value: stats?.favoritesCount || 0,
      icon: <Heart className="w-6 h-6" />,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    },
    {
      title: '認養申請',
      value: stats?.applicationsCount || 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: '社群貢獻',
      value: stats?.postsCount || 0,
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-600" />
            我的儀表板
          </h1>
          <p className="mt-2 text-gray-600">歡迎回來，{user?.username}！</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            // 決定卡片對應的路由
            const routeMap = {
              '瀏覽寵物': '/pets',
              '我的收藏': '/profile?tab=favorites',
              '認養申請': '/my-applications',
              '社群貢獻': '/community'
            };

            const route = routeMap[stat.title];
            const isClickable = Boolean(route);

            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-xl shadow-sm p-6 ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => {
                  if (isClickable) navigate(route);
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} bg-opacity-10 rounded-lg p-3`}>
                    <div className={stat.textColor}>
                      {stat.icon}
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
              </motion.div>
            );
          })}
        </div>

        {/* 配對進度 */}
        {stats?.matchingProfileComplete !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-600" />
                配對檔案完成度
              </h2>
              <span className={`text-2xl font-bold ${
                stats.matchingProfileComplete >= 80 ? 'text-green-600' :
                stats.matchingProfileComplete >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {stats.matchingProfileComplete}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.matchingProfileComplete}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  stats.matchingProfileComplete >= 80 ? 'bg-green-500' :
                  stats.matchingProfileComplete >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
              />
            </div>
            {stats.matchingProfileComplete < 100 && (
              <p className="mt-3 text-sm text-gray-600">
                完善您的配對檔案，獲得更精準的寵物推薦！
                <a href="/profile?tab=matching-profile" className="text-purple-600 hover:text-purple-700 ml-2">
                  立即完善 
                </a>
              </p>
            )}
          </motion.div>
        )}

        {/* 活動時間軸 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" />
            最近活動
          </h2>

          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">還沒有任何活動記錄</p>
              <p className="text-sm text-gray-500 mt-2">
                開始瀏覽寵物、發表貼文或申請認養吧！
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// 活動項目組件
const ActivityItem = ({ activity }) => {
  const getActivityIcon = (type) => {
    const icons = {
      pet_view: <Eye className="w-5 h-5" />,
      favorite: <Heart className="w-5 h-5" />,
      application: <FileText className="w-5 h-5" />,
      post: <MessageSquare className="w-5 h-5" />,
      comment: <MessageSquare className="w-5 h-5" />
    };
    return icons[type] || <TrendingUp className="w-5 h-5" />;
  };

  const getActivityColor = (type) => {
    const colors = {
      pet_view: 'bg-blue-100 text-blue-600',
      favorite: 'bg-red-100 text-red-600',
      application: 'bg-green-100 text-green-600',
      post: 'bg-purple-100 text-purple-600',
      comment: 'bg-purple-100 text-purple-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  return (
    <div className="flex gap-4 items-start">
      <div className={`${getActivityColor(activity.type)} rounded-full p-2 flex-shrink-0`}>
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTime(activity.createdAt)}</p>
      </div>
    </div>
  );
};

export default UserDashboardPage;
