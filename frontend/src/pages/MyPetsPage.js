import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';

const MyPetsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  // 獲取我的寵物列表
  const { data, isLoading, error, refetch } = useQuery(
    ['myPets', page],
    async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/pets/my-pets?page=${page}&limit=12`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('獲取寵物列表失敗');
      }

      return response.json();
    },
    {
      keepPreviousData: true,
      onError: (error) => {
        toast.error(error.message);
      }
    }
  );

  const handleEdit = (petId) => {
    navigate(`/pets/${petId}/edit`);
  };

  const handleDelete = async (petId) => {
    if (!window.confirm('確定要刪除這隻寵物嗎？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/pets/${petId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('刪除失敗');
      }

      toast.success('已刪除寵物資訊');
      refetch();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { text: '待領養', class: 'bg-green-100 text-green-800' },
      pending: { text: '審核中', class: 'bg-yellow-100 text-yellow-800' },
      adopted: { text: '已領養', class: 'bg-blue-100 text-blue-800' },
      pending_review: { text: '待審核', class: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[status] || statusConfig.available;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.class}`}>
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">載入失敗: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="btn-primary"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  const { pets = [], pagination = {} } = data || {};

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 標題與新增按鈕 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的送養資訊</h1>
            <p className="mt-2 text-gray-600">管理您發布的送養寵物資訊</p>
          </div>
          <button
            onClick={() => navigate('/pets/create')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ✚ 發布新送養
          </button>
        </div>

        {/* 寵物列表 */}
        {pets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🐾</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              尚未發布任何送養資訊
            </h3>
            <p className="text-gray-500 mb-6">
              點擊上方按鈕發布您的第一隻送養寵物
            </p>
            <button
              onClick={() => navigate('/pets/create')}
              className="btn-primary"
            >
              立即發布
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pets.map((pet) => (
                <div
                  key={pet._id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* 寵物照片 */}
                  <div className="relative h-48 bg-gray-200">
                    {pet.photos && pet.photos.length > 0 ? (
                      <img
                        src={`http://localhost:5000${pet.photos[0].url}`}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-5xl">🐾</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(pet.adoptionStatus)}
                    </div>
                  </div>

                  {/* 寵物資訊 */}
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {pet.name}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <p>品種: {pet.breed}</p>
                      <p>
                        年齡: {pet.age?.value} {pet.age?.unit === 'years' ? '歲' : '月'}
                      </p>
                      <p>性別: {pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知'}</p>
                      <p className="text-xs text-gray-400">
                        發布於: {new Date(pet.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/pets/${pet._id}`)}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleEdit(pet._id)}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(pet._id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分頁 */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一頁
                </button>
                <span className="text-gray-600">
                  第 {pagination.currentPage} / {pagination.totalPages} 頁
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一頁
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyPetsPage;