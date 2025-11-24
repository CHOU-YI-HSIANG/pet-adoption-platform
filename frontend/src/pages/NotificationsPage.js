import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bell, Check, Trash2, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all, unread
  const [page, setPage] = useState(1);

  // 獲取通知列表
  const { data: notificationsData, isLoading } = useQuery(
    ['notifications', page, filter],
    async () => {
      const unreadParam = filter === 'unread' ? '&unreadOnly=true' : '';
      const response = await fetch(
        `http://localhost:5000/api/notifications?page=${page}&limit=20${unreadParam}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (!response.ok) throw new Error('載入失敗');
      return response.json();
    },
    {
      select: (response) => response.data,
      keepPreviousData: true
    }
  );

  // 標記全部已讀
  const markAllReadMutation = useMutation(
    async () => {
      const response = await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('操作失敗');
      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('已標記所有通知為已讀');
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['notificationUnreadCount']);
      },
      onError: () => {
        toast.error('操作失敗');
      }
    }
  );

  // 刪除已讀通知
  const deleteReadMutation = useMutation(
    async () => {
      const response = await fetch('http://localhost:5000/api/notifications', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('操作失敗');
      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('已刪除所有已讀通知');
        queryClient.invalidateQueries(['notifications']);
      },
      onError: () => {
        toast.error('刪除失敗');
      }
    }
  );

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination || {};

  const formatTime = (date) => {
    return new Date(date).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      message: '',
      comment: '',
      reply: '',
      like: '',
      adoption_received: '',
      adoption_approved: '',
      adoption_rejected: '',
      adoption_completed: '',
      pet_status_changed: '',
      post_published: '',
      lost_pet_found: '',
      system: ''
    };
    return icons[type] || '';
  };

  const isCorruptedText = (s) => {
    if (!s || typeof s !== 'string') return true;
    const qm = (s.match(/\?/g) || []).length;
    if (qm >= 4) return true;
    if (s.trim().length === 0) return true;
    return false;
  };

  const fallbackFor = (notification) => {
    const type = notification.type || 'system';
    const petName = notification.relatedPet?.name || '';
    switch (type) {
      case 'adoption_received':
        return {
          title: '收到新的認養申請',
          content: petName ? `有人想認養您發布的 ${petName}，請前往查看申請詳情。` : '有人提交了認養申請，請前往查看詳情。'
        };
      case 'adoption_approved':
        return { title: '認養申請已核准', content: petName ? `${petName} 的申請已核准` : '您的認養申請已核准' };
      case 'adoption_rejected':
        return { title: '認養申請未通過', content: petName ? `${petName} 的申請未通過` : '您的認養申請未通過' };
      default:
        return { title: notification.title || '通知', content: notification.content || '' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">通知中心</h1>
            <p className="text-gray-600">查看所有通知與更新</p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              全部已讀
            </button>
            <button
              onClick={() => deleteReadMutation.mutate()}
              disabled={deleteReadMutation.isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              清除已讀
            </button>
          </div>
        </div>

        {/* 篩選標籤 */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            未讀
          </button>
        </div>

        {/* 通知列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    if (notification.link) {
                      navigate(notification.link);
                    }
                  }}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* 圖標 */}
                    <div className="text-3xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? '沒有未讀通知' : '暫無通知'}
              </h3>
              <p className="text-gray-600">
                {filter === 'unread' ? '所有通知都已讀取' : '目前還沒有任何通知'}
              </p>
            </div>
          )}
        </div>

        {/* 分頁 */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一頁
            </button>
            <span className="px-4 py-2 text-gray-600">
              第 {page} / {pagination.pages} 頁
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
