import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuth } from './auth';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  // 連接到 Socket.IO 伺服器
  connect(userId) {
    if (this.socket && this.isConnected) {
      return;
    }

    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling']
    });

    // 連接成功
    this.socket.on('connect', () => {
      console.log('Socket 連接成功');
      this.isConnected = true;
      
      // 加入使用者房間
      if (userId) {
        this.socket.emit('join', userId);
      }
    });

    // 連接失敗
    this.socket.on('connect_error', (error) => {
      console.error('Socket 連接失敗:', error);
      this.isConnected = false;
    });

    // 斷線
    this.socket.on('disconnect', (reason) => {
      console.log('Socket 已斷線:', reason);
      this.isConnected = false;
      
      // 如果是伺服器主動斷線，嘗試重連
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    // 設定訊息相關監聽器
    this.setupMessageListeners();
    
    // 設定通知相關監聽器
    this.setupNotificationListeners();

    return this.socket;
  }

  // 設定訊息相關監聽器
  setupMessageListeners() {
    if (!this.socket) return;

    // 接收新訊息
    this.socket.on('newMessage', (message) => {
      console.log('收到新訊息:', message);
      
      // 觸發自定義事件
      this.emit('messageReceived', message);
      
      // 顯示通知 (如果不在對話頁面)
      if (window.location.pathname !== `/messages/${message.sender._id}`) {
        toast.success(`${message.sender.firstName} 發送了一則訊息`);
      }
    });

    // 訊息已讀確認
    this.socket.on('messageReadConfirm', (data) => {
      console.log('訊息已讀確認:', data);
      this.emit('messageRead', data);
    });

    // 對方正在輸入
    this.socket.on('userTyping', (data) => {
      console.log('使用者正在輸入:', data);
      this.emit('userTyping', data);
    });
  }

  // 設定通知相關監聽器
  setupNotificationListeners() {
    if (!this.socket) return;

    // 認養申請通知
    this.socket.on('adoptionNotification', (notification) => {
      console.log('認養通知:', notification);
      this.emit('adoptionNotification', notification);
      
      switch (notification.type) {
        case 'application_received':
          toast.success('收到新的認養申請');
          break;
        case 'application_approved':
          toast.success('您的認養申請已通過！');
          break;
        case 'application_rejected':
          toast.error('很抱歉，您的認養申請未通過');
          break;
        default:
          toast.info(notification.message);
      }
    });

    // 系統通知
    this.socket.on('systemNotification', (notification) => {
      console.log('系統通知:', notification);
      this.emit('systemNotification', notification);
      toast.info(notification.message);
    });

    // 後端直接發的通用通知 (Notification.createNotification 會發出 'newNotification')
    this.socket.on('newNotification', (notification) => {
      console.log('收到 newNotification (socket):', notification);
      // 轉發到內部事件系統，讓 UI 元件能透過 socketService.on('newNotification', ...) 收到
      this.emit('newNotification', notification);
      // 也顯示簡短 toast
      if (notification && notification.type) {
        if (notification.type.startsWith('adoption_')) {
          toast.success(notification.title || '通知');
        } else {
          toast.info(notification.title || '通知');
        }
      }
    });
  }

  // 發送訊息
  sendMessage(receiverId, message) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('sendMessage', {
      receiverId,
      message
    });
  }

  // 標記訊息為已讀
  markMessageAsRead(senderId, messageId) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('messageRead', {
      senderId,
      messageId
    });
  }

  // 發送正在輸入狀態
  sendTypingStatus(receiverId, isTyping) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('typing', {
      receiverId,
      isTyping
    });
  }

  // 加入房間
  joinRoom(roomId) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('joinRoom', roomId);
  }

  // 離開房間
  leaveRoom(roomId) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('leaveRoom', roomId);
  }

  // 監聽自定義事件
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  // 移除事件監聽器
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // 觸發自定義事件
  emit(event, data) {
    if (!this.eventListeners.has(event)) return;
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('事件回調錯誤:', error);
      }
    });
  }

  // 斷開連接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  // 檢查連接狀態
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  // 重新連接
  reconnect(userId) {
    this.disconnect();
    setTimeout(() => {
      this.connect(userId);
    }, 1000);
  }
}

// React Context Provider
const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // 連接狀態監聽
  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleOnlineUsers = (users) => setOnlineUsers(users);

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('onlineUsers', handleOnlineUsers);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('onlineUsers', handleOnlineUsers);
    };
  }, []);

  // 自動在使用者登入時建立 socket 連線，並在登出或使用者為 null 時斷線
  const { user } = useAuth();
  useEffect(() => {
    if (user && user._id) {
      socketService.connect(user._id);
    } else {
      socketService.disconnect();
    }
    // 不監聽 socketService 變化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 當收到新的通知時，自動依據通知內容使與認養申請相關的查詢重新抓取
  const queryClient = useQueryClient();
  useEffect(() => {
    const handleNewNotification = (notification) => {
      try {
        // 重新抓取管理端收到的申請列表
        queryClient.invalidateQueries('myPetsApplications');
        // 重新抓取使用者自己的申請列表
        queryClient.invalidateQueries('myApplications');
        // 重新抓取通知相關的查詢 (鈴鐺與通知中心)
        queryClient.invalidateQueries(['recentNotifications']);
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['notificationUnreadCount']);
        // 如果通知有相關的 adoption id，重新抓取該申請詳情
        if (notification && (notification.relatedAdoption || notification.relatedAdoptionId)) {
          const adoptionId = notification.relatedAdoption || notification.relatedAdoptionId;
          queryClient.invalidateQueries(['applicationDetail', String(adoptionId)]);
        }
      } catch (e) {
        console.error('Invalidate queries on newNotification failed', e);
      }
    };

    socketService.on('newNotification', handleNewNotification);
    return () => socketService.off('newNotification', handleNewNotification);
  }, [queryClient]);

  const value = {
    socket: socketService,
    isConnected,
    onlineUsers,
    connect: socketService.connect.bind(socketService),
    disconnect: socketService.disconnect.bind(socketService),
    emit: socketService.emit.bind(socketService),
    on: socketService.on.bind(socketService),
    off: socketService.off.bind(socketService),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// 單例模式
const socketService = new SocketService();

export default socketService;