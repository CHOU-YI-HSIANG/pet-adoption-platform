import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Package,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Download,
  Search,
  Filter,
  DollarSign  // Story 3.6: 助養圖示
} from 'lucide-react';
import { motion } from 'framer-motion';
import ApplicationDetailModal from '../components/ApplicationDetailModal';

const ShelterDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('applications');
  const [dateRange, setDateRange] = useState(30);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 權限檢查
  React.useEffect(() => {
    if (!user || (user.role !== 'shelter' && user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, navigate]);

  // 取得統計資料
  const { data: stats, isLoading } = useQuery(
    ['shelterStats', user?._id, dateRange],
    async () => {
      if (user.role === 'admin') {
        const res = await fetch(`http://localhost:5000/api/adoptions/admin/stats`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch admin stats');
        return res.json();
      }

      const response = await fetch(
        `http://localhost:5000/api/shelters/${user._id}/stats?range=${dateRange}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    {
      enabled: !!user,
      select: (response) => {
        // admin stats endpoint returns { statusCounts, monthlyCompletions, averageProcessingTime }
        if (user.role === 'admin') return response;
        return response.data;
      }
    }
  );

  // 取得申請列表
  const { data: applications } = useQuery(
    ['shelterApplications', user?._id],
    async () => {
      if (user.role === 'admin') {
        // 管理員直接使用後端的 admin 列表（後端已過濾為 admin-published 的申請）
        const res = await fetch(`http://localhost:5000/api/adoptions/admin/all?limit=1000`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch admin applications');
        const data = await res.json();
        // admin/all 回傳 { applications, pagination }
        return data.applications || [];
      }

      const shelterPetsResponse = await fetch(
        `http://localhost:5000/api/pets?createdBy=${user._id}&showAll=true&limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      ).then(res => res.json());

      // 正確解析後端回傳的資料結構
      const shelterPets = shelterPetsResponse.pets || [];
      
      const petIds = shelterPets.map(pet => pet._id);
      
      const adoptionsResponse = await fetch(
        `http://localhost:5000/api/adoptions`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      ).then(res => res.json());

      // 確保 adoptions 是陣列
      const adoptions = Array.isArray(adoptionsResponse)
        ? adoptionsResponse
        : (adoptionsResponse.data || adoptionsResponse.adoptions || []);

      return adoptions.filter(app => petIds.includes(app.pet?._id));
    },
    {
      enabled: !!user
    }
  );

  // 取得寵物列表
  const { data: pets } = useQuery(
    ['shelterPets', user?._id],
    async () => {
      const response = await fetch(
        `http://localhost:5000/api/pets?createdBy=${user._id}&showAll=true&limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch pets');
      const data = await response.json();
      // 正確解析後端回傳的資料結構: { pets: [...], pagination: {...} }
      return data.pets || [];
    },
    {
      enabled: !!user
    }
  );

  // 只保留申請管理分頁給管理者，其他頁面在此隱藏以免影響平台運作
  const tabs = [
    { id: 'applications', name: '申請管理', icon: FileText }
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overview = stats?.overview || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <LayoutDashboard className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">收容所儀表板</h1>
        </div>
        <p className="text-gray-600">管理您的寵物與認養申請</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'applications' && (
        <ApplicationManagementTab
          overview={overview}
          applications={applications || []}
          onViewDetails={(id) => {
            setSelectedApplicationId(id);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* 已移除：我的寵物 / 統計資料 頁面 (保留底層元件以免影響其他功能) */}

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
  );
};

// Tab 1: 申請管理
const ApplicationManagementTab = ({ overview, applications, onViewDetails }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApplications = applications.filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch = !searchTerm || 
      app.pet?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // 使用目前取得的 applications 計算三個關鍵指標，避免與後端欄位不同步
  const shelterApplications = applications || [];
  const totalCount = shelterApplications.length;
  const pendingCount = shelterApplications.filter(a => a.status === 'pending').length;
  const now = new Date();
  const monthApplications = shelterApplications.filter(a => {
    try {
      const d = new Date(a.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    } catch (e) {
      return false;
    }
  }).length;
  const approvedCount = shelterApplications.filter(a => ['approved', 'completed'].includes(a.status)).length;
  const approvalRateCalc = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const statCards = [
    {
      title: '待審核申請',
      value: pendingCount,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: '本月申請數',
      value: monthApplications,
      icon: TrendingUp,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: '核准率',
      value: `${approvalRateCalc}%`,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 統計卡片：三格，調整大小與間距 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className={`text-2xl font-semibold mt-2 ${card.textColor}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-2 rounded-full`}> 
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 篩選器 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜尋寵物或申請人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部狀態</option>
              <option value="pending">待審核</option>
              <option value="under_review">審核中</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒絕</option>
            </select>
          </div>
        </div>
      </div>

      {/* 申請列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                申請編號
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                申請人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                寵物
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                提交日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  目前沒有申請記錄
                </td>
              </tr>
            ) : (
              filteredApplications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {app.applicationId || app._id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {app.applicant?.username || '未知'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {app.pet?.name || '未知'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(app.createdAt).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                      onClick={() => onViewDetails(app._id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Tab 2: 我的寵物
const MyPetsTab = ({ pets, overview }) => {
  const navigate = useNavigate(); // Story 3.6: 導航功能

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="總寵物數"
          value={overview.totalPets || 0}
          color="bg-blue-500"
        />
        <StatCard
          title="待認養"
          value={overview.availablePets || 0}
          color="bg-green-500"
        />
        <StatCard
          title="已認養"
          value={overview.adoptedPets || 0}
          color="bg-purple-500"
        />
        <StatCard
          title="申請中"
          value={overview.pendingPets || 0}
          color="bg-yellow-500"
        />
      </div>

      {/* 寵物列表 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">寵物列表</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 新增寵物
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  照片
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  名稱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  物種
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  年齡
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    尚未新增寵物
                  </td>
                </tr>
              ) : (
                pets.map((pet) => (
                  <tr key={pet._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={pet.images?.[0] || '/placeholder.jpg'}
                        alt={pet.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pet.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pet.species === 'dog' ? '狗' : '貓'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof pet.age === 'object' && pet.age !== null 
                        ? `${pet.age.value} ${pet.age.unit === 'years' ? '歲' : pet.age.unit === 'months' ? '個月' : ''}` 
                        : pet.age}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={pet.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => navigate(`/shelter/pets/${pet._id}/edit`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        編輯
                      </button>
                      <button className="text-red-600 hover:text-red-900">刪除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Tab 3: 統計資料
const StatisticsTab = ({ stats, dateRange, setDateRange }) => {
  const overview = stats?.overview || {};

  const exportToCSV = () => {
    const csvContent = [
      ['指標', '數值'],
      ['總寵物數', overview.totalPets],
      ['待認養寵物', overview.availablePets],
      ['已認養寵物', overview.adoptedPets],
      ['總申請數', overview.totalApplications],
      ['核准率', `${overview.approvalRate}%`],
      ['平均認養天數', overview.averageAdoptionDays],
      ['平均審核時間', `${overview.averageReviewTime}小時`]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `統計資料_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* 日期範圍選擇器 */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-700 font-medium">日期範圍:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>最近 7 天</option>
            <option value={30}>最近 30 天</option>
            <option value={90}>最近 90 天</option>
            <option value={365}>最近一年</option>
          </select>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-5 h-5" />
          匯出 CSV
        </button>
      </div>

      {/* 關鍵指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="總寵物數" value={overview.totalPets || 0} color="bg-blue-500" />
        <StatCard title="總申請數" value={overview.totalApplications || 0} color="bg-purple-500" />
        <StatCard title="成功認養數" value={overview.successfulAdoptions || 0} color="bg-green-500" />
        <StatCard title="平均認養天數" value={`${overview.averageAdoptionDays || 0} 天`} color="bg-yellow-500" />
      </div>

      {/* 物種分布圖表 */}
      {stats?.speciesDistribution && stats.speciesDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">物種分布</h3>
          <div className="space-y-4">
            {stats.speciesDistribution.map((item) => {
              const total = stats.speciesDistribution.reduce((sum, s) => sum + s.count, 0);
              const percentage = Math.round((item.count / total) * 100);
              return (
                <div key={item.species}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {item.species === 'dog' ? '狗' : item.species === 'cat' ? '貓' : '其他'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Story 3.6: 助養統計 */}
      {overview.sponsorshipEnabled > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">助養系統統計</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-gray-600 mb-1">已啟用助養</div>
              <div className="text-2xl font-bold text-orange-600">{overview.sponsorshipEnabled}</div>
              <div className="text-xs text-gray-500">隻寵物</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-gray-600 mb-1">總點擊次數</div>
              <div className="text-2xl font-bold text-orange-600">{overview.totalSponsorshipClicks}</div>
              <div className="text-xs text-gray-500">次</div>
            </div>
          </div>

          {/* 熱門助養寵物 Top 5 */}
          {stats?.topSponsoredPets && stats.topSponsoredPets.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">🔥 熱門助養寵物</h4>
              <div className="space-y-2">
                {stats.topSponsoredPets.map((pet, index) => (
                  <div key={pet._id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-orange-100">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-600">#{index + 1}</span>
                    </div>
                    {pet.photos && pet.photos[0] && (
                      <img 
                        src={`http://localhost:5000${pet.photos[0].url}`} 
                        alt={pet.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{pet.name}</div>
                      <div className="text-xs text-gray-500">{pet.species === 'dog' ? '狗' : pet.species === 'cat' ? '貓' : '其他'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">{pet.sponsorship.clickCount}</div>
                      <div className="text-xs text-gray-500">次點擊</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 輔助組件
const StatCard = ({ title, value, color }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <p className="text-sm text-gray-600 mb-2">{title}</p>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    <div className={`mt-2 h-1 ${color} rounded-full`}></div>
  </div>
);

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: '待審核', color: 'bg-yellow-100 text-yellow-800' },
    under_review: { label: '審核中', color: 'bg-blue-100 text-blue-800' },
    approved: { label: '已核准', color: 'bg-green-100 text-green-800' },
    rejected: { label: '已拒絕', color: 'bg-red-100 text-red-800' },
    available: { label: '待認養', color: 'bg-green-100 text-green-800' },
    adopted: { label: '已認養', color: 'bg-purple-100 text-purple-800' },
    completed: { label: '已完成', color: 'bg-gray-100 text-gray-800' }
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

export default ShelterDashboardPage;
