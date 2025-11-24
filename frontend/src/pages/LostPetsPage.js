import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, MapPin, Calendar, Phone, DollarSign, MessageCircle, Heart, User, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../services/auth';
import PetCardSkeleton from '../components/PetCardSkeleton';
import EmptyState from '../components/EmptyState';

const LostPetsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page')) || 1;
  const type = searchParams.get('type') || 'all';

  // 類型篩選選項
  const typeOptions = [
    { value: 'all', label: '全部' },
    { value: 'lost-pet', label: '走失寵物' },
    { value: 'found-pet', label: '發現寵物' },
  ];

  // 取得走失寵物貼文
  const { data: postsData, isLoading } = useQuery(
    ['lostPets', type, page],
    async () => {
      const params = new URLSearchParams({
        type: type === 'all' ? undefined : type,
        page: page.toString(),
        limit: '15',
        sort: 'publishedAt'
      });
      
      // 如果是 all，需要同時取得兩種類型
      if (type === 'all') {
        params.delete('type');
        params.set('types', 'lost-pet,found-pet');
      }
      
      const response = await fetch(`http://localhost:5000/api/posts?${params.toString()}`);
      if (!response.ok) throw new Error('載入失敗');
      return response.json();
    },
    {
      select: (response) => response.data,
      keepPreviousData: true
    }
  );

  // 切換類型
  const handleTypeChange = (newType) => {
    setSearchParams({ type: newType, page: '1' });
  };

  // 切換頁碼
  const handlePageChange = (newPage) => {
    setSearchParams({ type, page: newPage.toString() });
  };

  // 計算走失天數
  const getDaysLost = (lastSeenDate) => {
    const today = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffTime = Math.abs(today - lastSeen);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero 區域 */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-12 h-12 mr-4" />
            <h1 className="text-4xl font-bold">走失寵物協尋</h1>
          </div>
          <p className="text-center text-xl text-red-100 max-w-2xl mx-auto">
            幫助走失的毛孩回家，或將發現的寵物送回主人身邊
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 類型篩選 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {typeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleTypeChange(option.value)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  type === option.value
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {isAuthenticated && (
            <Link
              to="/community/create"
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              發布協尋
            </Link>
          )}
        </div>

        {/* 貼文列表 */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <PetCardSkeleton key={i} />
            ))}
          </div>
        ) : postsData?.posts?.length > 0 ? (
          <>
            {/* 結果統計 */}
            <div className="mb-4 text-gray-600">
              共 {postsData.pagination?.total || 0} 則協尋貼文
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {postsData.posts.map((post, index) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* 緊急標籤 */}
                  {post.type === 'lost-pet' && post.lostPetInfo?.lastSeenDate && (
                    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span className="font-bold">緊急</span>
                      </div>
                      <span className="text-sm">
                        已走失 {getDaysLost(post.lostPetInfo.lastSeenDate)} 天
                      </span>
                    </div>
                  )}

                  {post.type === 'found-pet' && (
                    <div className="bg-green-600 text-white px-4 py-2 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      <span className="font-bold">發現寵物</span>
                    </div>
                  )}

                  {/* 圖片 */}
                  {post.images && post.images.length > 0 && (
                    <img
                      src={post.images[0].url || post.images[0]}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                  )}

                  <div className="p-4">
                    {/* 標題 */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h3>

                    {/* 走失寵物資訊 */}
                    {post.lostPetInfo && (
                      <div className="space-y-2 mb-4 text-sm">
                        {post.lostPetInfo.petName && (
                          <div className="flex items-center text-gray-700">
                            <User className="w-4 h-4 mr-2 text-gray-500" />
                            <span>寵物名稱：{post.lostPetInfo.petName}</span>
                          </div>
                        )}
                        
                        {post.lostPetInfo.lastSeenLocation && (
                          <div className="flex items-center text-gray-700">
                            <MapPin className="w-4 h-4 mr-2 text-red-500" />
                            <span className="line-clamp-1">{post.lostPetInfo.lastSeenLocation}</span>
                          </div>
                        )}
                        
                        {post.lostPetInfo.lastSeenDate && (
                          <div className="flex items-center text-gray-700">
                            <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                            <span>{new Date(post.lostPetInfo.lastSeenDate).toLocaleDateString('zh-TW')}</span>
                          </div>
                        )}

                        {post.lostPetInfo.reward && post.type === 'lost-pet' && (
                          <div className="flex items-center text-orange-600 font-semibold">
                            <DollarSign className="w-4 h-4 mr-2" />
                            <span>懸賞金額：NT$ {post.lostPetInfo.reward.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 作者 */}
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center mr-2">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <span>
                        {post.author?.firstName} {post.author?.lastName}
                      </span>
                      <span className="mx-2"></span>
                      <span>{new Date(post.createdAt).toLocaleDateString('zh-TW')}</span>
                    </div>

                    {/* 互動統計 */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          <span>{post.stats?.likes || 0}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          <span>{post.stats?.comments || 0}</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          <span>{post.stats?.views || 0}</span>
                        </div>
                      </div>

                      <Link
                        to={`/community/${post._id}`}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        查看詳情
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 分頁 */}
            {postsData.pagination && postsData.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!postsData.pagination.hasPrevPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一頁
                </button>

                {Array.from({ length: postsData.pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    return p === 1 || 
                           p === postsData.pagination.totalPages || 
                           Math.abs(p - page) <= 1;
                  })
                  .map((p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) {
                      return (
                        <React.Fragment key={`ellipsis-${p}`}>
                          <span className="px-2">...</span>
                          <button
                            onClick={() => handlePageChange(p)}
                            className={`px-4 py-2 border rounded-lg ${
                              p === page
                                ? 'bg-red-600 text-white border-red-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`px-4 py-2 border rounded-lg ${
                          p === page
                            ? 'bg-red-600 text-white border-red-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!postsData.pagination.hasNextPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一頁
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="目前沒有協尋貼文"
            description={
              isAuthenticated
                ? '成為第一個發布協尋貼文的人'
                : '登入後即可發布協尋貼文'
            }
            actionText="發布協尋"
            actionLink="/community/create"
            showAction={isAuthenticated}
          />
        )}
      </div>
    </div>
  );
};

export default LostPetsPage;
