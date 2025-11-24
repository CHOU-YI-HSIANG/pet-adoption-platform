import axios from 'axios';
import { toast } from 'react-hot-toast';

// 建立 axios 實例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// 檢查是否使用模擬資料（已禁用，強制使用真實後端）
let useMockData = false;

// 請求攔截器 - 添加認證 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 記錄是否已經顯示過登入過期提示
let hasShownLoginExpiredToast = false;

// 回應攔截器 - 處理錯誤
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // 不顯示錯誤的端點列表（這些端點有 mock 資料處理）
      const silentEndpoints = ['/pets', '/api/stats', '/stats', '/featured', '/recommendations'];
      const isSilentEndpoint = silentEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
      
      // 不自動登出的端點（這些失敗不應該強制登出）
      const noAutoLogoutEndpoints = [
        '/recommendations',
        '/browsing-history',
        '/matching',
        '/stats',
        '/notifications'
      ];
      const shouldNotAutoLogout = noAutoLogoutEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
      
      switch (status) {
        case 401:
          // 只有在非豁免端點且尚未顯示過提示時才執行登出
          if (!shouldNotAutoLogout && !hasShownLoginExpiredToast) {
            hasShownLoginExpiredToast = true;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            toast.error('登入已過期，請重新登入');
            
            // 延遲 2 秒後才重定向，給使用者時間看到錯誤訊息
            setTimeout(() => {
              window.location.href = '/login';
              hasShownLoginExpiredToast = false;
            }, 2000);
          }
          break;
        case 403:
          if (!isSilentEndpoint) {
            toast.error('沒有權限執行此操作');
          }
          break;
        case 404:
          // 對有 mock 資料的端點不顯示錯誤
          const silent404Endpoints = ['/pets', '/api/stats', '/stats', '/featured', '/recommendations', '/browsing-history'];
          const isSilent404 = silent404Endpoints.some(endpoint => 
            error.config?.url?.includes(endpoint)
          );
          if (!isSilent404 && !isSilentEndpoint) {
            toast.error('找不到請求的資源');
          }
          break;
        case 429:
          toast.error('請求過於頻繁，請稍後再試');
          break;
        case 500:
          // 對有 mock 資料的端點不顯示錯誤
          if (!isSilentEndpoint) {
            toast.error('伺服器錯誤，請稍後再試');
          }
          break;
        default:
          if (!isSilentEndpoint) {
            toast.error(data?.message || '發生未知錯誤');
          }
      }
    } else if (error.request) {
      // 檢查是否為預期的網路錯誤（後端未連接）
      const silentEndpoints = ['/pets', '/api/stats', '/stats', '/featured', '/recommendations'];
      const isSilentEndpoint = silentEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
      
      if (!isSilentEndpoint) {
        console.error('網路錯誤詳情:', {
          url: error.config?.url,
          method: error.config?.method,
          error: error.message,
          request: error.request
        });
        
        // 更詳細的錯誤訊息
        if (error.message === 'Network Error') {
          toast.error('無法連接到伺服器，請檢查後端是否運行');
        } else if (error.code === 'ECONNABORTED') {
          toast.error('請求超時，請檢查網路連線');
        } else {
          toast.error(`網路連線錯誤: ${error.message}`);
        }
      }
    } else {
      console.error('請求設定錯誤:', error);
      toast.error('請求設定錯誤');
    }
    
    return Promise.reject(error);
  }
);

// 認證相關 API
export const authAPI = {
  // 一般登入
  login: (credentials) => api.post('/auth/login', credentials),
  
  // 註冊
  register: (userData) => api.post('/auth/register', userData),
  
  // Google OAuth 登入 (One Tap)
  googleLogin: (token) => api.post('/auth/google/verify', { token }),
  
  // 登出
  logout: () => api.post('/auth/logout'),
  
  // 忘記密碼
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  
  // 重設密碼
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  
  // 驗證電子郵件
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  
  // 取得目前使用者
  getCurrentUser: () => api.get('/auth/me'),
  
  // 驗證 token
  verifyToken: (token) => api.post('/auth/verify-token', { token }),
  
  // 更新個人資料
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  
  // 變更密碼
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
};

// 寵物相關 API
export const petAPI = {
  // 取得寵物列表
  getPets: async (params = {}) => {
    return await api.get('/pets', { params });
  },
  
  // 取得單一寵物
  getPet: async (id) => {
    return await api.get(`/pets/${id}`);
  },
  
  // 建立寵物
  createPet: (petData) => api.post('/pets', petData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // 更新寵物
  updatePet: (id, petData) => api.put(`/pets/${id}`, petData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // 刪除寵物
  deletePet: (id) => api.delete(`/pets/${id}`),
  
  // 搜尋寵物
  searchPets: (query) => api.get('/pets/search', { params: { q: query } }),
  
  // 取得寵物分類
  getCategories: () => api.get('/pets/categories'),
  
  // 喜愛/取消喜愛寵物
  toggleFavorite: (id) => api.post(`/pets/${id}/favorite`),
  
  // Story 1.2: 取得推薦寵物
  getRecommendedPets: async () => {
    return await api.get('/pets/recommended');
  },
  
  // 取得精選寵物
  getFeaturedPets: async (limit = 6) => {
    return await api.get('/pets/featured', { params: { limit } });
  },
};

// 認養相關 API
export const adoptionAPI = {
  // 提交認養申請
  submitApplication: (petId, applicationData) => 
    api.post('/adoptions', { petId, ...applicationData }),
  
  // 取得使用者的認養申請
  getMyApplications: (params = {}) => api.get('/adoptions/my', { params }),
  
  // 取得單一認養申請
  getApplication: (id) => api.get(`/adoptions/${id}`),
  
  // 更新認養申請
  updateApplication: (id, data) => api.put(`/adoptions/${id}`, data),
  
  // 審核認養申請
  reviewApplication: (id, decision, reason) => 
    api.post(`/adoptions/${id}/review`, { decision, reason }),
  
  // 完成認養
  completeAdoption: (id, data) => api.post(`/adoptions/${id}/complete`, data),
  
  // 取得機構的認養申請
  getShelterApplications: (params = {}) => api.get('/adoptions/shelter', { params }),
};

// 使用者相關 API
export const userAPI = {
  // 取得使用者資料
  getProfile: () => api.get('/users/profile'),
  
  // 更新使用者資料
  updateProfile: (userData) => api.put('/users/profile', userData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // 更改密碼
  changePassword: (passwordData) => api.put('/users/password', passwordData),
  
  // 取得使用者的寵物
  getUserPets: (userId) => api.get(`/users/${userId}/pets`),
  
  // 取得使用者的文章
  getUserPosts: (userId, params = {}) => api.get(`/users/${userId}/posts`, { params }),
  
  // 取得使用者的喜愛清單
  getFavorites: () => api.get('/users/favorites'),
  
  // 刪除帳號
  deleteAccount: () => api.delete('/users/profile'),
};

// 文章相關 API
export const postAPI = {
  // 取得文章列表
  getPosts: (params = {}) => api.get('/posts', { params }),
  
  // 取得單一文章
  getPost: (id) => api.get(`/posts/${id}`),
  
  // 建立文章
  createPost: (postData) => api.post('/posts', postData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // 更新文章
  updatePost: (id, postData) => api.put(`/posts/${id}`, postData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // 刪除文章
  deletePost: (id) => api.delete(`/posts/${id}`),
  
  // 喜愛/取消喜愛文章
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  
  // 取得文章分類
  getCategories: () => api.get('/posts/categories/list'),
};

// 評論相關 API
export const commentAPI = {
  // 取得文章評論
  getPostComments: (postId, params = {}) => 
    api.get(`/comments/post/${postId}`, { params }),
  
  // 取得評論回覆
  getCommentReplies: (commentId, params = {}) => 
    api.get(`/comments/${commentId}/replies`, { params }),
  
  // 建立評論
  createComment: (commentData) => api.post('/comments', commentData),
  
  // 回覆評論
  replyToComment: (commentId, content) => 
    api.post(`/comments/${commentId}/reply`, { content }),
  
  // 編輯評論
  updateComment: (id, content) => api.put(`/comments/${id}`, { content }),
  
  // 刪除評論
  deleteComment: (id) => api.delete(`/comments/${id}`),
  
  // 喜愛/取消喜愛評論
  toggleLike: (id) => api.post(`/comments/${id}/like`),
  
  // 檢舉評論
  reportComment: (id, reason, description) => 
    api.post(`/comments/${id}/report`, { reason, description }),
};

// 訊息相關 API
export const messageAPI = {
  // 取得對話列表
  getConversations: () => api.get('/messages/conversations'),
  
  // 取得對話記錄
  getConversation: (userId, params = {}) => 
    api.get(`/messages/conversation/${userId}`, { params }),
  
  // 發送訊息
  sendMessage: (messageData) => api.post('/messages', messageData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // 編輯訊息
  editMessage: (id, content) => api.put(`/messages/${id}`, { content }),
  
  // 刪除訊息
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  
  // 標記訊息為已讀
  markAsRead: (id) => api.post(`/messages/${id}/read`),
  
  // 標記對話為已讀
  markConversationAsRead: (userId) => 
    api.post(`/messages/conversation/${userId}/read-all`),
  
  // 取得未讀訊息數量
  getUnreadCount: () => api.get('/messages/unread-count'),
};

// 檔案上傳 API
export const uploadAPI = {
  // 上傳圖片
  uploadImage: (file, type = 'general') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 上傳檔案
  uploadFile: (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// 通用 API 服務
export const generalAPI = {
  // 獲取統計數據
  getStats: async () => {
    // api 已設定 baseURL 為 http://.../api，這裡只需呼叫 /stats
    return await api.get('/stats');
  },
  
  // 搜索功能
  search: (query, filters = {}) => api.get('/api/search', {
    params: { q: query, ...filters }
  }),
  
  // 上傳檔案
  uploadFile: (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 獲取設定
  getSettings: () => api.get('/api/settings'),
  
  // 更新設定
  updateSettings: (settings) => api.put('/api/settings', settings),
  
  // 健康檢查
  healthCheck: () => api.get('/api/health'),
  
  // 獲取地區列表
  getRegions: () => api.get('/api/regions'),
  
  // 獲取品種列表
  getBreeds: (species) => api.get('/api/breeds', {
    params: { species }
  }),
  
  // 報告問題
  reportIssue: (issue) => api.post('/api/issues', issue),
  
  // 獲取 FAQ
  getFAQ: () => api.get('/api/faq'),
  
  // 聯絡我們
  contactUs: (message) => api.post('/api/contact', message),
  
  // 訂閱電子報
  subscribe: (email) => api.post('/api/subscribe', { email }),
  
  // 取消訂閱
  unsubscribe: (email, token) => api.post('/api/unsubscribe', { email, token }),
  
  // 獲取公告
  getAnnouncements: () => api.get('/api/announcements'),
  
  // 獲取活動列表
  getEvents: (params = {}) => api.get('/api/events', { params }),
  
  // 獲取志工機會
  getVolunteerOpportunities: () => api.get('/api/volunteer-opportunities'),
  
  // 申請成為志工
  applyVolunteer: (application) => api.post('/api/volunteer-applications', application),
  
  // 獲取捐款資訊
  getDonationInfo: () => api.get('/api/donations/info'),
  
  // 創建捐款
  createDonation: (donation) => api.post('/api/donations', donation),
  
  // 獲取捐款歷史
  getDonationHistory: (params = {}) => api.get('/api/donations/history', { params }),
  
  // 獲取收據
  getReceipt: (donationId) => api.get(`/api/donations/${donationId}/receipt`),
  
  // 搜尋 (全局)
  globalSearch: (query) => api.get('/search', { params: { q: query } }),
  
  // 取得位置資訊
  getLocations: () => api.get('/locations'),
  
  // Story 1.2: 推薦系統 API
  getRecommendations: (params = {}) => api.get('/recommendations', { params }),
  refreshRecommendations: () => api.post('/recommendations/refresh'),
  
  // Story 1.3: 瀏覽歷史 API
  recordBrowsingHistory: (petId) => api.post('/browsing-history', { petId }),
  getBrowsingHistory: (params = {}) => api.get('/browsing-history', { params }),
  clearBrowsingHistory: () => api.delete('/browsing-history'),
};

// Story 3.2: 配對分析 API
export const matchingAPI = {
  // 取得配對分析
  analyzeMatch: (petId) => api.get(`/matching/analyze/${petId}`),
  
  // 取得最佳配對列表
  getBestMatches: (params = {}) => api.get('/matching/best-matches', { params }),
  
  // 批次配對分析
  batchAnalyze: (petIds) => api.post('/matching/batch-analyze', { petIds }),
  
  // 取得所有配對檔案
  getProfile: () => api.get('/matching/profile'),
  
  // 更新生活方式檔案
  updateLifestyleProfile: (data) => api.put('/matching/profile/lifestyle', data),
  
  // 更新經驗檔案
  updateExperienceProfile: (data) => api.put('/matching/profile/experience', data),
  
  // 更新環境檔案
  updateEnvironmentProfile: (data) => api.put('/matching/profile/environment', data),
};

export default api;