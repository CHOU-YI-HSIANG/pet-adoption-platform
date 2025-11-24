import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../services/socket';

const NotificationBell = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  // 獲取未讀數量
  const { data: unreadData } = useQuery(
    ['notificationUnreadCount'],
    async () => {
      const token = localStorage.getItem('token');
      if (!token) return { count: 0 };
      
      const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return { count: 0 };
      const data = await response.json();
      return data.data || data;
    },
    {
      refetchInterval: 10000, // 每10秒重新取得
      retry: false,
      staleTime: 5000
    }
  );

  // 獲取最近通知（下拉選單顯示）
  const { data: notificationsData } = useQuery(
    ['recentNotifications'],
    async () => {
      const token = localStorage.getItem('token');
      if (!token) return { notifications: [] };
      
      const response = await fetch('http://localhost:5000/api/notifications?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return { notifications: [] };
      const data = await response.json();
      return data.data || data;
    },
    {
      enabled: showDropdown,
      retry: false
    }
  );

  // 監聽即時通知
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      // 重新取得未讀數量
      queryClient.invalidateQueries(['notificationUnreadCount']);
      queryClient.invalidateQueries(['recentNotifications']);
      queryClient.invalidateQueries(['notifications']);
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket, queryClient]);

  const unreadCount = unreadData?.count || 0;
  const notifications = notificationsData?.notifications || [];

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return notifDate.toLocaleDateString('zh-TW', { 
      month: 'short', 
      day: 'numeric' 
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
    // treat as corrupted if many question marks or non-printable
    const qm = (s.match(/\?/g) || []).length;
    if (qm >= 4) return true;
    // also treat empty after trimming as corrupted
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
    <div className="relative">
      {/* 鈴鐺按鈕 */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        
        {/* 未讀數量徽章 */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉選單 */}
      {showDropdown && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* 通知列表 */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            {/* 標題 */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">通知</h3>
              {unreadCount > 0 && (
                <span className="text-sm text-gray-500">{unreadCount} 則未讀</span>
              )}
            </div>

            {/* 通知項目 */}
            {notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={async () => {
                      // 標記為已讀
                      if (!notification.isRead) {
                        try {
                          const token = localStorage.getItem('token');
                          await fetch(`http://localhost:5000/api/notifications/${notification._id}/read`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          // 重新取得通知列表和未讀數量
                          queryClient.invalidateQueries(['notificationUnreadCount']);
                          queryClient.invalidateQueries(['recentNotifications']);
                          queryClient.invalidateQueries(['notifications']);
                        } catch (error) {
                          console.error('標記通知已讀失敗:', error);
                        }
                      }
                      
                      // 導航到通知相關頁面
                      if (notification.link) {
                        navigate(notification.link);
                      }
                      setShowDropdown(false);
                    }}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {isCorruptedText(notification.title) ? fallbackFor(notification).title : notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {isCorruptedText(notification.content) ? fallbackFor(notification).content : notification.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 查看全部按鈕 */}
                <div className="p-3 text-center border-t border-gray-200">
                  <button
                    onClick={() => {
                      navigate('/notifications');
                      setShowDropdown(false);
                    }}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    查看全部通知
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">暫無通知</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
