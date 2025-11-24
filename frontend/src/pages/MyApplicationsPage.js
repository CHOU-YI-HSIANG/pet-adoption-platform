import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ApplicationDetailModal from '../components/ApplicationDetailModal';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Calendar, Eye, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from 'react-query';
import { motion } from 'framer-motion';

const MyApplicationsPage = () => {
  const [page, setPage] = useState(1);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const applicationId = params.get('applicationId');
      if (applicationId) {
        setSelectedApplicationId(applicationId);
        setIsModalOpen(true);
      }
    } catch (e) {
      // ignore
    }
  }, [location.search]);

  // 獲取我的認養申請
  const queryClient = useQueryClient();
  const { data: applicationsData, isLoading, error, refetch } = useQuery(
    ['myApplications', page],
    async () => {
      const response = await fetch(
        `http://localhost:5000/api/adoptions/my-applications?page=${page}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('載入失敗');
      }
      
      return response.json();
    },
    {
      keepPreviousData: true
    }
  );

  const [cancelingId, setCancelingId] = React.useState(null);

  const handleCancel = async (applicationId) => {
    if (!applicationId) return;
    try {
      setCancelingId(applicationId);
      const res = await fetch(`http://localhost:5000/api/adoptions/${applicationId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body && body.error ? body.error : '取消失敗');
      }

      toast.success('取消申請成功');
      // 重新抓取我的申請列表
      if (refetch) await refetch();
      // 也更新快取相關查詢（保險）
      try {
        queryClient.invalidateQueries('myApplications');
        queryClient.invalidateQueries('myPetsApplications');
        queryClient.invalidateQueries(['applicationDetail', String(applicationId)]);
      } catch (e) {
        // ignore
      }

    } catch (e) {
      console.error('取消申請失敗:', e);
      toast.error(e.message || '取消申請失敗');
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: '待審核',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-4 h-4" />
      },
      approved: {
        label: '已通過',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-4 h-4" />
      },
      rejected: {
        label: '已拒絕',
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="w-4 h-4" />
      },
      cancelled: {
        label: '已取消',
        color: 'bg-gray-100 text-gray-800',
        icon: <AlertCircle className="w-4 h-4" />
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">我的認養申請</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">我的認養申請</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">載入失敗，請稍後再試</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">我的認養申請</h1>
        <p className="mt-2 text-gray-600">追蹤您的寵物認養申請進度</p>
      </div>

      {applicationsData?.applications && applicationsData.applications.length > 0 ? (
        <>
          <div className="space-y-6">
            {applicationsData.applications.map((application) => (
              <motion.div
                key={application._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="md:flex">
                  {/* 寵物圖片 */}
                    <div className="md:w-64 h-48 md:h-auto">
                    <img
                      src={(() => {
                        const pet = application.pet || {};
                        if (pet.primaryPhoto && pet.primaryPhoto.url) return pet.primaryPhoto.url;
                        if (Array.isArray(pet.photos) && pet.photos.length > 0) {
                          const first = pet.photos[0];
                          if (typeof first === 'string') return first;
                          if (first.url) return first.url;
                          if (first.filename) return `/uploads/pets/${first.filename}`;
                        }
                        if (Array.isArray(pet.images) && pet.images.length > 0) return pet.images[0];
                        return '/placeholder-pet.jpg';
                      })()}
                      alt={application.pet?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 申請資訊 */}
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Link
                          to={`/pets/${application.pet?._id}`}
                          className="text-xl font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                        >
                          {application.pet?.name}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          {application.pet?.species} · {application.pet?.breed}
                        </p>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>申請日期: {(() => {
                          const candidates = [application.submittedAt, application.createdAt, application.agreementDate];
                          for (const c of candidates) {
                            if (!c) continue;
                            const d = new Date(c);
                            if (!isNaN(d.getTime())) return d.toLocaleDateString('zh-TW');
                          }
                          return '未知';
                        })()}</span>
                      </div>
                      
                      {application.shelter && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>收容所: {application.shelter.name || '未知'}</span>
                        </div>
                      )}

                      {application.reviewedAt && (
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          <span>審核日期: {new Date(application.reviewedAt).toLocaleDateString('zh-TW')}</span>
                        </div>
                      )}
                    </div>

                    {/* 申請理由 */}
                    {application.reason && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">申請理由:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{application.reason}</p>
                      </div>
                    )}

                    {/* 審核意見 */}
                    {application.reviewNotes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">審核意見:</p>
                        {(() => {
                          const notes = Array.isArray(application.reviewNotes) ? application.reviewNotes : [application.reviewNotes];
                          const last = notes.length > 0 ? notes[notes.length - 1] : null;
                          const text = last ? (typeof last === 'string' ? last : (last.note || last.message || JSON.stringify(last))) : '尚無';
                          return <p className="text-sm text-gray-600">{text}</p>;
                        })()}
                      </div>
                    )}

                    {/* 顯示審核決定與原因（例如拒絕理由） */}
                    {application.reviewDecision && application.reviewDecision.reason && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">審核原因:</p>
                        <p className="text-sm text-gray-600">{application.reviewDecision.reason}</p>
                      </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="mt-4 flex gap-3">
                      <Link
                        to={`/pets/${application.pet?._id}`}
                        className="btn-secondary text-sm"
                      >
                        查看寵物詳情
                      </Link>
                      {application.status === 'pending' && (
                        <button
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                          onClick={() => handleCancel(application._id)}
                          disabled={cancelingId === application._id}
                        >
                          {cancelingId === application._id ? '取消中...' : '取消申請'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 分頁 */}
          {applicationsData.pagination && applicationsData.pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={!applicationsData.pagination.hasPrevPage}
                className="pagination-btn"
              >
                上一頁
              </button>

              <span className="px-4 py-2 text-gray-700">
                第 {page} / {applicationsData.pagination.totalPages} 頁
              </span>

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!applicationsData.pagination.hasNextPage}
                className="pagination-btn"
              >
                下一頁
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">還沒有認養申請</h3>
          <p className="text-gray-600 mb-6">開始瀏覽可愛的毛小孩，提交您的第一份認養申請</p>
          <Link to="/pets" className="btn-primary">
            瀏覽寵物
          </Link>
        </div>
      )}
      {/* 申請詳情模態框 (可由 query param 打開) */}
      <ApplicationDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedApplicationId(null);
        }}
        applicationId={selectedApplicationId}
      />
    </div>
  );
};

export default MyApplicationsPage;