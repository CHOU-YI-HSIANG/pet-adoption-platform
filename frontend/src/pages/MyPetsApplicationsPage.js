import React, { useState, useEffect } from 'react';
import ApplicationDetailModal from '../components/ApplicationDetailModal';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

const MyPetsApplicationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  // 此頁面應顯示「我發布的寵物收到的申請」；即便是 admin 帳號也只看自己發布的寵物
  const apiEndpoint = '/api/adoptions/my-pets-applications';

  // 獲取收到的申請列表
  const { data, isLoading } = useQuery(
    ['myPetsApplications', filter, user?._id],
    async () => {
      const token = localStorage.getItem('token');
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`http://localhost:5000${apiEndpoint}${statusParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('載入失敗');
      return response.json();
    }
  );

  // 審核申請
  const reviewMutation = useMutation(
    async ({ id, decision, reason }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/adoptions/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision, reason })
      });
      if (!response.ok) throw new Error('審核失敗');
      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('審核完成');
        queryClient.invalidateQueries(['myPetsApplications']);
      },
      onError: () => {
        toast.error('審核失敗,請稍後再試');
      }
    }
  );

  const handleReview = (id, decision) => {
    let reason = '';
    if (decision === 'rejected') {
      reason = prompt('請輸入拒絕原因:');
      if (!reason) return;
    }
    reviewMutation.mutate({ id, decision, reason });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '待審核', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { text: '已通過', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { text: '已拒絕', color: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    );
  };

  const applications = data?.data?.applications || [];

  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!location) return;
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
  }, [location && location.search]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 頁面標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">收到的認養申請</h1>
          <p className="mt-2 text-gray-600">管理您發布的寵物收到的認養申請</p>
        </div>

        {/* 篩選器 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' && '全部'}
                {status === 'pending' && '待審核'}
                {status === 'approved' && '已通過'}
                {status === 'rejected' && '已拒絕'}
              </button>
            ))}
          </div>
        </div>

        {/* 申請列表 */}
        {applications.length > 0 ? (
          <div className="grid gap-6">
            {applications.map((app) => (
              <div key={app._id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex gap-6">
                  {/* 寵物照片 */}
                    <div className="flex-shrink-0">
                    <img
                      src={(() => {
                        const pet = app.pet || {};
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
                      alt={app.pet?.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>

                  {/* 申請資訊 */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{app.pet?.name}</h3>
                        <p className="text-gray-600">申請者: {app.applicant?.username}</p>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">申請日期:</span>
                        <span className="ml-2 text-gray-900">{(() => {
                          const candidates = [app.submittedAt, app.createdAt, app.agreementDate];
                          for (const c of candidates) {
                            if (!c) continue;
                            const d = new Date(c);
                            if (!isNaN(d.getTime())) return d.toLocaleDateString('zh-TW');
                          }
                          return '未知';
                        })()}</span>
                      </div>
                      {(() => {
                          // 使用與 ApplicationDetailModal 相同的候選優先順序：
                          // applicantDetails.contact.phone, applicantDetails.contactPhone, personalInfo.phone, contactInfo.phone, applicant.phone
                          const candidates = [
                            app.applicantDetails?.contact?.phone,
                            app.applicantDetails?.contactPhone,
                            app.personalInfo?.contact?.phone,
                            app.personalInfo?.phone,
                            app.contactInfo?.phone,
                            app.applicant?.phone
                          ];
                          // rawSubmission (若存在) 作為最後 fallback
                          if (app.rawSubmission) {
                            candidates.push(
                              app.rawSubmission?.applicantDetails?.contact?.phone,
                              app.rawSubmission?.applicantDetails?.contactPhone,
                              app.rawSubmission?.contactInfo?.phone,
                              app.rawSubmission?.contactPhone
                            );
                          }

                          let phone = null;
                          for (const c of candidates) {
                            if (typeof c === 'string' && c.trim()) { phone = c.trim(); break; }
                            if (typeof c === 'number') { phone = String(c); break; }
                          }

                          return phone ? (
                            <div>
                              <span className="text-gray-500">聯絡電話:</span>
                              <span className="ml-2 text-gray-900">{phone}</span>
                            </div>
                          ) : null;
                        })()}
                    </div>

                    {/* 操作按鈕 */}
                      <div className="flex gap-3">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(app._id, 'approved')}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            通過
                          </button>
                          <button
                            onClick={() => handleReview(app._id, 'rejected')}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            拒絕
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          console.log('Attempt open application modal, id=', app._id);
                          // 權限檢查：只能由申請人、該寵物發布者 (createdBy) 或 admin 查看詳情
                          const me = user && user._id ? user._id : null;
                          const isApplicant = me && app.applicant && (app.applicant._id === me || app.applicant._id === me?.toString());
                          const petCreatorId = app.pet && app.pet.createdBy && (app.pet.createdBy._id || app.pet.createdBy);
                          const isPetOwner = me && petCreatorId && (petCreatorId === me || petCreatorId === me?.toString());
                          const isAdmin = user && (user.role === 'admin' || user.role === 'volunteer');

                          if (!isApplicant && !isPetOwner && !isAdmin) {
                            try { window.alert('您沒有權限查看此申請詳情。'); } catch(e){}
                            console.warn('Blocked opening application details due to insufficient permissions', { me, appId: app._id, appApplicant: app.applicant, petCreatorId });
                            return;
                          }

                          setSelectedApplicationId(app._id);
                          setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        查看申請詳情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暫無申請記錄</p>
          </div>
        )}
        {/* 申請詳情模態框 */}
        <ApplicationDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedApplicationId(null);
          }}
          applicationId={selectedApplicationId}
        />
      </div>
    </div>
  );
};

export default MyPetsApplicationsPage;
