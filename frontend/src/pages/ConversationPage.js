import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ArrowLeft, Send, Paperclip, Image, Check, CheckCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const ConversationPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 從token解析當前用戶ID
  const [currentUserId, setCurrentUserId] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload._id || payload.id || payload.userId);
      } catch (error) {
        console.error('解析token失敗:', error);
      }
    }
  }, []);

  // 獲取對話記錄
  const { data: conversationData, isLoading } = useQuery(
    ['conversation', userId],
    async () => {
      const response = await fetch(
        `http://localhost:5000/api/messages/conversation/${userId}`,
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
      refetchInterval: 3000, // 每3秒重新取得
      onSuccess: () => {
        scrollToBottom();
      }
    }
  );

  // 標記對話為已讀
  useEffect(() => {
    if (conversationData?.messages?.length > 0) {
      fetch(`http://localhost:5000/api/messages/conversation/${userId}/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).catch(err => console.error('標記已讀失敗:', err));
    }
  }, [userId, conversationData?.messages?.length]);

  // 發送訊息
  const sendMessageMutation = useMutation(
    async (content) => {
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          receiver: userId,
          type: 'text'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        // 顯示後端返回的具體錯誤訊息
        throw new Error(error.message || error.error || '發送失敗');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        setMessage('');
        queryClient.invalidateQueries(['conversation', userId]);
        queryClient.invalidateQueries(['conversations']);
        scrollToBottom();
      },
      onError: (error) => {
        toast.error(error.message || '發送失敗');
      },
      onSettled: () => {
        setIsSending(false);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    sendMessageMutation.mutate(message.trim());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return '今天';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return messageDate.toLocaleDateString('zh-TW', {
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // 群組訊息依日期
  const groupMessagesByDate = (messages) => {
    if (!messages) return {};
    
    return messages.reduce((groups, message) => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  };

  const messages = conversationData?.messages || [];
  const otherUser = conversationData?.otherUser;
  const groupedMessages = groupMessagesByDate(messages);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* 頭部 */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 sticky top-16 z-10">
          <button
            onClick={() => navigate('/messages')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {otherUser && (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                {otherUser.firstName?.[0] || 'U'}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">
                  {otherUser.firstName} {otherUser.lastName}
                </h2>
                <p className="text-sm text-gray-500">@{otherUser.username}</p>
              </div>
            </>
          )}
        </div>

        {/* 訊息區域 */}
        <div className="px-4 py-6 space-y-6">
          {Object.keys(groupedMessages).length > 0 ? (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* 日期分隔線 */}
                <div className="flex items-center justify-center mb-4">
                  <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                    {formatDate(dateMessages[0].createdAt)}
                  </span>
                </div>

                {/* 該日期的訊息 */}
                <div className="space-y-3">
                  {dateMessages.map((msg, index) => {
                    const isCurrentUser = msg.sender._id === currentUserId;
                    
                    return (
                      <motion.div
                        key={msg._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* 頭像 */}
                        {!isCurrentUser && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {msg.sender.firstName?.[0] || 'U'}
                          </div>
                        )}

                        {/* 訊息氣泡 */}
                        <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isCurrentUser
                                ? 'bg-orange-600 text-white rounded-tr-sm'
                                : 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          
                          {/* 時間和狀態 */}
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isCurrentUser && (
                              <>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3 h-3 text-blue-500" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>還沒有訊息，開始對話吧！</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 輸入框 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="輸入訊息..."
                disabled={isSending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!message.trim() || isSending}
                className="w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationPage;
