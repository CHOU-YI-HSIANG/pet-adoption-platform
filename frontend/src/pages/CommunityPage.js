import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { postAPI } from '../services/api';
import { useAuth } from '../services/auth';
import PostCard from '../components/PostCard';
import PetCardSkeleton from '../components/PetCardSkeleton';
import EmptyState from '../components/EmptyState';
import { Plus, MessageCircle } from 'lucide-react';

const CommunityPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  
  const activeType = searchParams.get('type') || 'all';
  const activeSort = searchParams.get('sort') || 'publishedAt';
  const page = parseInt(searchParams.get('page')) || 1;

  // 貼文類型標籤
  const types = [
    { value: 'all', label: '全部' },
    { value: 'general', label: '一般' },
    { value: 'lost-pet', label: '走失寵物' },
    { value: 'found-pet', label: '發現寵物' },
    { value: 'adoption-story', label: '領養故事' },
  ];

  // 排序選項
  const sortOptions = [
    { value: 'publishedAt', label: '最新發布' },
    { value: 'likes', label: '最多讚' },
    { value: 'comments', label: '最多留言' },
  ];

  // 取得貼文列表
  const { data: postsData, isLoading, refetch } = useQuery(
    ['posts', activeType, activeSort, page],
    () => postAPI.getPosts({
      type: activeType === 'all' ? undefined : activeType,
      sort: activeSort,
      page,
      limit: 15,
    }),
    {
      select: (response) => response.data.data, // 提取兩層 data
      keepPreviousData: true,
      refetchOnMount: 'always', // 確保每次進入頁面都重新fetch
      onSuccess: (data) => {
        console.log('📝 載入貼文:', data.posts?.length || 0, '篇');
        console.log('貼文列表:', data.posts);
      }
    }
  );

  const handleTypeChange = (type) => {
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('sort', activeSort);
    setSearchParams(params);
  };

  const handleSortChange = (sort) => {
    const params = new URLSearchParams();
    params.set('type', activeType);
    params.set('sort', sort);
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams();
    params.set('type', activeType);
    params.set('sort', activeSort);
    params.set('page', newPage);
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">社群動態</h1>
            <p className="text-gray-600">分享與探索寵物相關的故事與資訊</p>
          </div>
          {isAuthenticated && (
            <Link
              to="/community/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              發布貼文
            </Link>
          )}
        </div>

        {/* 篩選標籤 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            {/* 類型篩選 */}
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeType === type.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* 排序選擇 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">排序：</span>
              <select
                value={activeSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="input-field"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 貼文列表 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <PetCardSkeleton key={i} />
            ))}
          </div>
        ) : postsData?.posts?.length > 0 ? (
          <>
            {/* 結果計數 */}
            <div className="mb-4">
              <p className="text-gray-600">
                共 <span className="font-semibold text-gray-900">{postsData.pagination.totalItems}</span> 篇貼文
              </p>
            </div>

            {/* 貼文網格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {postsData.posts.map((post, index) => (
                <PostCard key={post._id} post={post} index={index} />
              ))}
            </div>

            {/* 分頁 */}
            {postsData.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!postsData.pagination.hasPrevPage}
                  className="pagination-btn"
                >
                  上一頁
                </button>

                {[...Array(postsData.pagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === postsData.pagination.totalPages ||
                    (pageNum >= page - 2 && pageNum <= page + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`pagination-btn ${pageNum === page ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (pageNum === page - 3 || pageNum === page + 3) {
                    return (
                      <span key={pageNum} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!postsData.pagination.hasNextPage}
                  className="pagination-btn"
                >
                  下一頁
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={MessageCircle}
            title="還沒有貼文"
            description={
              isAuthenticated
                ? '成為第一個發布貼文的人吧！'
                : '登入後即可發布貼文與社群互動'
            }
            actionText={isAuthenticated ? '發布貼文' : '立即登入'}
            actionLink={isAuthenticated ? '/community/create' : '/login'}
          />
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
