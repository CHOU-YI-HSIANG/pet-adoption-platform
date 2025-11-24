import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const ProfilePage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: 'profile', label: '個人資料' },
    { id: 'favorites', label: '我的收藏' },
    { id: 'savedPosts', label: '收藏的貼文' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">個人中心</h1>
          <p className="mt-2 text-gray-600">管理您的個人資料與活動記錄</p>
        </div>

        {/* Tab 導航 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-6 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab 內容 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'favorites' && <FavoritesTab />}
          {activeTab === 'savedPosts' && <SavedPostsTab />}
        </div>
      </div>
    </div>
  );
};

// 個人資料 Tab
const ProfileTab = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.contact_info?.phone || '',
    address: {
      city: user?.address?.city || '',
      district: user?.address?.district || '',
      street: user?.address?.street || '',
      postalCode: user?.address?.postalCode || ''
    }
  });

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile(formData);
    if (result.success) {
      setIsEditing(false);
      toast.success('個人資料已更新');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">基本資料</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary"
          >
            編輯資料
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓氏
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              聯絡電話
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="input-field"
              pattern="09\d{8}"
              placeholder="09xxxxxxxx"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                城市
              </label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => handleChange('address.city', e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                區域
              </label>
              <input
                type="text"
                value={formData.address.district}
                onChange={(e) => handleChange('address.district', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              詳細街道地址
            </label>
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) => handleChange('address.street', e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              郵遞區號（選填）
            </label>
            <input
              type="text"
              value={formData.address.postalCode}
              onChange={(e) => handleChange('address.postalCode', e.target.value)}
              className="input-field"
              pattern="\d{3}(\d{2})?"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary"
            >
              儲存變更
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4 max-w-2xl">
          <div>
            <p className="text-sm text-gray-600">使用者名稱</p>
            <p className="text-lg font-medium text-gray-900">{user?.username}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">電子郵件地址</p>
            <p className="text-lg font-medium text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">姓名</p>
            <p className="text-lg font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">聯絡電話</p>
            <p className="text-lg font-medium text-gray-900">
              {user?.contact_info?.phone || '未設定'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">帳號類型</p>
            <p className="text-lg font-medium text-gray-900">
              {user?.role === 'user' ? '一般使用者' :
               user?.role === 'shelter' ? '收容所' : '管理員'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// 我的收藏 Tab
const FavoritesTab = () => {
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, error } = useQuery(
    ['favorites', refreshKey],
    async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('載入失敗');
      return response.json();
    }
  );

  const removeFavoriteMutation = useMutation(
    async (petId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/favorites/${petId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('操作失敗');
      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('已移除收藏');
        setRefreshKey(prev => prev + 1);
        // 使 favorites 與 userStats 快取失效以保證各處顯示一致
        try {
          queryClient.invalidateQueries('favorites');
          queryClient.invalidateQueries('userStats');
        } catch (e) { /* no-op */ }
      }
    }
  );

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">載入失敗，請稍後再試</div>;
  }

  const favorites = data?.data?.favorites || [];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">我的收藏</h2>
      
      {favorites.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          尚無收藏的寵物
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((pet) => (
            <motion.div
              key={pet._id}
              whileHover={{ y: -4 }}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link to={`/pets/${pet._id}`}>
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={pet.photos?.[0]?.url || pet.photos?.[0] || pet.primaryPhoto?.url || '/placeholder-pet.jpg'}
                    alt={pet.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => e.target.src = '/placeholder-pet.jpg'}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{pet.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{pet.breed}</p>
                  <div className="flex items-center justify-between">
                    <span className={`
                      inline-block px-3 py-1 rounded-full text-xs font-medium
                      ${pet.adoptionStatus === 'available'
                        ? 'bg-green-100 text-green-700'
                        : pet.adoptionStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                      }
                    `}>
                      {pet.adoptionStatus === 'available' ? '可領養' :
                       pet.adoptionStatus === 'pending' ? '審核中' : '已領養'}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <button
                  onClick={() => removeFavoriteMutation.mutate(pet._id)}
                  className="w-full btn-secondary text-sm"
                >
                  取消收藏
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// 收藏的貼文 Tab
const SavedPostsTab = () => {
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, error } = useQuery(
    ['savedPosts', refreshKey],
    async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/saved-posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('載入失敗');
      return response.json();
    }
  );

  const unsaveMutation = useMutation(
    async (postId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/saved-posts/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('操作失敗');
      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('已取消收藏');
        setRefreshKey(prev => prev + 1);
      }
    }
  );

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">載入失敗，請稍後再試</div>;
  }

  const posts = data?.data?.posts || [];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">收藏的貼文</h2>
      
      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          尚無收藏的貼文
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div
              key={post._id}
              whileHover={{ y: -2 }}
              className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all"
            >
              <Link to={`/community/${post._id}`} className="flex gap-4 p-4">
                {post.images && post.images.length > 0 && (
                  <img
                    src={post.images[0].url}
                    alt={post.title}
                    className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {post.content?.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>👁️ {post.stats?.views || 0}</span>
                    <span>❤️ {post.stats?.likes || 0}</span>
                    <span>💬 {post.stats?.comments || 0}</span>
                  </div>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <button
                  onClick={() => unsaveMutation.mutate(post._id)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  取消收藏
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};



export default ProfilePage;
