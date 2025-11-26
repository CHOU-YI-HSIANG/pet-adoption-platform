import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Bookmark, Eye, MapPin, Calendar, DollarSign, User, MessageCircle, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../services/auth';
import LikeButton from '../components/LikeButton';
import SaveButton from '../components/SaveButton';
import CommentSection from '../components/CommentSection';

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);

  // 獲取貼文詳情
  const { data: post, isLoading } = useQuery(
    ['post', id],
    async () => {
      const response = await fetch(`http://localhost:5000/api/posts/${id}`, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {}
      });
      if (!response.ok) throw new Error('載入失敗');
      const result = await response.json();
      return result.data;
    },
    {
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      staleTime: 0
    }
  );

  // 刪除貼文
  const deleteMutation = useMutation(
    async () => {
      const response = await fetch(`http://localhost:5000/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('刪除失敗');
      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('貼文已刪除');
        queryClient.invalidateQueries(['posts']);
        navigate('/community');
      },
      onError: () => {
        toast.error('刪除失敗，請稍後再試');
      }
    }
  );

  const handleDelete = () => {
    if (window.confirm('確定要刪除這篇貼文嗎？此操作無法復原。')) {
      deleteMutation.mutate();
    }
  };

  const handleEdit = () => {
    navigate(`/community/edit/${id}`);
  };

  // 檢查是否為貼文作者 - 比較 _id 欄位
  const isAuthor = user && post && (user._id === post.author?._id || user.id === post.author?._id);
  
  // Debug: 顯示比較的值
  if (user && post) {
    console.log('用戶 ID:', user._id || user.id);
    console.log('貼文作者 ID:', post.author?._id);
    console.log('是否為作者:', isAuthor);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">找不到貼文</h2>
          <button
            onClick={() => navigate('/community')}
            className="text-orange-600 hover:text-orange-700"
          >
            返回社群
          </button>
        </div>
      </div>
    );
  }

  const typeLabels = {
    'general': '一般',
    'lost-pet': '尋找走失寵物',
    'found-pet': '發現寵物',
    'adoption-story': '領養故事'
  };

  const typeBadgeColors = {
    'general': 'bg-blue-100 text-blue-800',
    'lost-pet': 'bg-red-100 text-red-800',
    'found-pet': 'bg-green-100 text-green-800',
    'adoption-story': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        {/* 返回按鈕 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>

        {/* 貼文卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm overflow-hidden"
        >
          {/* 類型標籤 */}
          <div className="px-6 pt-6 pb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${typeBadgeColors[post.type]}`}>
              {typeLabels[post.type]}
            </span>
          </div>

          {/* 作者資訊與操作按鈕 */}
          <div className="px-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                {post.author?.firstName?.[0] || 'U'}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {post.author?.firstName} {post.author?.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* 作者操作選單 */}
            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Edit2 className="w-4 h-4" />
                      編輯貼文
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      刪除貼文
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 標題 */}
          <div className="px-6 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
          </div>

          {/* 圖片 */}
          {post.images && post.images.length > 0 && (
            <div className="mb-6">
              <img
                src={post.images[0].url || post.images[0]}
                alt={post.images[0].alt || post.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* 內容 */}
          <div className="px-6 pb-6">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* 走失寵物資訊 */}
          {(post.type === 'lost-pet' || post.type === 'found-pet') && post.lostPetInfo && (
            <div className="px-6 pb-6 border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">寵物資訊</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>寵物名稱：{post.lostPetInfo.petName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>最後地點：{post.lostPetInfo.lastSeenLocation}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>最後日期：{new Date(post.lostPetInfo.lastSeenDate).toLocaleDateString('zh-TW')}</span>
                </div>
                {post.type === 'lost-pet' && post.lostPetInfo.reward && (
                  <div className="flex items-center gap-2 text-orange-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    <span>酬謝金：NT$ {post.lostPetInfo.reward.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 互動按鈕 */}
          <div className="px-6 pb-6 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-6">
              <LikeButton
                postId={post._id}
                initialLiked={post.isLiked || false}
                initialCount={post.stats?.likes || 0}
                showCount={true}
              />
              <div className="flex items-center gap-1 text-gray-600">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{post.stats?.comments || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Eye className="w-5 h-5" />
                <span className="text-sm">{post.stats?.views || 0}</span>
              </div>
            </div>
            <SaveButton postId={post._id} initialSaved={post.isSaved || false} />
          </div>
        </motion.div>

        {/* 留言區 */}
        <CommentSection postId={id} />
      </div>
    </div>
  );
};

export default PostDetailPage;
