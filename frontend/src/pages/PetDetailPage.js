import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { petAPI, generalAPI } from '../services/api';
import { useAuth } from '../services/auth';
import MatchAnalysisPanel from '../components/MatchAnalysisPanel';
import toast from 'react-hot-toast';
import { 
  Heart, 
  MapPin, 
  Calendar,
  User,
  Shield,
  Stethoscope,
  ArrowLeft,
  Share2,
  Target,
  X,
  DollarSign,  // Story 3.6: 助養圖示
  ExternalLink,  // 外部連結圖示
  MessageCircle  // 私訊圖示
} from 'lucide-react';

const PetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showMatchAnalysis, setShowMatchAnalysis] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const queryClient = useQueryClient();

  // 檢查是否已收藏 - 從後端 API 獲取
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!id || !isAuthenticated) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/users/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const favorites = data.data.favorites || [];
          setIsFavorite(favorites.some(pet => pet._id === id));
        }
      } catch (error) {
        console.error('檢查收藏狀態失敗:', error);
      }
    };

    checkFavoriteStatus();
  }, [id, isAuthenticated]);

  // 取得寵物詳細資訊
  const { data: pet, isLoading, error } = useQuery(
    ['pet', id],
    () => petAPI.getPet(id),
    {
      select: (response) => response.data,
    }
  );

  // Story 3.2: 取得配對分析
  const { data: matchAnalysis, isLoading: matchLoading } = useQuery(
    ['matchAnalysis', id],
    async () => {
      const response = await fetch(`http://localhost:5000/api/matching/analyze/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch match analysis');
      return response.json();
    },
    {
      enabled: isAuthenticated && !!id,
      select: (response) => response.data,
      retry: false,
      onError: (err) => {
        console.log('配對分析尚未可用:', err.message);
      }
    }
  );

  // Story 1.3: 記錄瀏覽歷史
  useEffect(() => {
    if (pet && id) {
      if (isAuthenticated) {
        // 已登入：呼叫 API 記錄
        generalAPI.recordBrowsingHistory(id).catch(err => {
          console.error('記錄瀏覽歷史失敗:', err);
        });
      } else {
        // 未登入：記錄到 localStorage
        try {
          const history = JSON.parse(localStorage.getItem('browsingHistory') || '[]');
          
          // 移除重複的寵物 ID
          const filteredHistory = history.filter(item => item.petId !== id);
          
          // 新增當前瀏覽記錄到陣列開頭
          filteredHistory.unshift({
            petId: id,
            viewedAt: new Date().toISOString()
          });
          
          // 限制為 50 筆
          const limitedHistory = filteredHistory.slice(0, 50);
          
          localStorage.setItem('browsingHistory', JSON.stringify(limitedHistory));
        } catch (err) {
          console.error('儲存瀏覽歷史失敗:', err);
        }
      }
    }
  }, [pet, id, isAuthenticated]);

  const handleAdoptClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/adopt/${id}`);
    } else {
      navigate(`/adopt/${id}`);
    }
  };

  // 收藏功能
  const handleToggleFavorite = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('請先登入');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/users/favorites/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('收藏操作失敗');
      }

      const data = await response.json();
      setIsFavorite(data.data.favorited);
      // 使我的收藏與使用者統計快取重新取得最新資料
      try {
        queryClient.invalidateQueries('favorites');
        queryClient.invalidateQueries('userStats');
      } catch (e) { /* no-op */ }

      toast.success(data.message);
    } catch (error) {
      console.error('收藏操作失敗:', error);
      toast.error('操作失敗，請稍後再試');
    }
  };

  // Story 3.6: 處理助養點擊
  const handleSponsorClick = async () => {
    if (!pet?.sponsorship?.externalLink) {
      alert('助養連結尚未設定');
      return;
    }

    try {
      // 記錄點擊 (非同步,不阻塞)
      await fetch(`http://localhost:5000/api/pets/${id}/sponsorship/click`, {
        method: 'POST'
      }).catch(err => console.error('記錄助養點擊失敗:', err));

      // 開啟外部連結
      window.open(pet.sponsorship.externalLink, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('助養點擊處理失敗:', error);
    }
  };

  const getSpeciesLabel = (species) => {
    const labels = {
      dog: '狗',
      cat: '貓',
      rabbit: '兔子',
      bird: '鳥',
      hamster: '倉鼠',
      'guinea-pig': '天竺鼠',
      other: '其他'
    };
    return labels[species] || species;
  };

  const getSizeLabel = (size) => {
    const labels = {
      small: '小型',
      medium: '中型',
      large: '大型',
      'extra-large': '超大型'
    };
    return labels[size] || size;
  };

  const getAgeCategoryLabel = (ageCategory) => {
    const labels = {
      young: '幼年',
      adult: '成年',
      senior: '老年'
    };
    return labels[ageCategory] || ageCategory;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-300 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">找不到此寵物</h2>
          <p className="text-gray-600 mb-4">此寵物可能已被認養或資料不存在。</p>
          <Link to="/pets" className="btn-primary">
            返回寵物列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按鈕 */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        返回
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* 照片區域 */}
        <div>
          <div className="sticky top-8">
            <div className="relative overflow-hidden rounded-lg shadow-lg">
              <img
                src={pet.primaryPhoto?.url || '/placeholder-pet.jpg'}
                alt={pet.name}
                className="w-full h-96 object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className="status-available">可認養</span>
              </div>
              <div className="absolute top-4 right-4">
                <button 
                  onClick={handleToggleFavorite}
                  className={`bg-white bg-opacity-90 rounded-full p-2 hover:bg-white transition-colors ${
                    isFavorite ? 'text-red-500' : 'text-gray-600'
                  }`}
                  title={isFavorite ? '取消收藏' : '加入收藏'}
                >
                  <Heart 
                    className="w-5 h-5" 
                    fill={isFavorite ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            </div>

            {/* 其他照片 */}
            {pet.photos && pet.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {pet.photos.slice(1, 5).map((photo, index) => (
                  <img
                    key={index}
                    src={photo.url}
                    alt={`${pet.name} ${index + 2}`}
                    className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                  />
                ))}
                {pet.photos.length > 5 && (
                  <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                    +{pet.photos.length - 5} 張
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 資訊區域 */}
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{pet.name}</h1>
            <p className="text-xl text-gray-600 mb-4">
              {getSpeciesLabel(pet.species)} • {pet.breed}
            </p>
            
            {/* 送養者資訊 */}
            {pet.createdBy && (pet.createdBy.username || pet.createdBy.firstName || pet.createdBy.lastName) && (
              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-4 py-3 mt-4">
                <User className="w-5 h-5" />
                <span className="text-sm">
                  送養者: <span className="font-medium text-gray-900">
                    {pet.createdBy.username || 
                     (pet.createdBy.firstName && pet.createdBy.lastName ? 
                       `${pet.createdBy.firstName} ${pet.createdBy.lastName}` : 
                       pet.createdBy.firstName || 
                       pet.createdBy.lastName || 
                       '用戶')}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">年齡</div>
              <div className="font-semibold">{pet.ageDescription}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">性別</div>
              <div className="font-semibold">
                {pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">體型</div>
              <div className="font-semibold">{getSizeLabel(pet.size)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">體重</div>
              <div className="font-semibold">
                {pet.weight ? `${pet.weight} kg` : '未提供'}
              </div>
            </div>
          </div>

          {/* 所在地點 */}
          <div className="flex items-center text-gray-600 mb-6">
            <MapPin className="w-5 h-5 mr-2" />
            <span>{pet.shelterInfo?.location}</span>
            <Calendar className="w-5 h-5 ml-4 mr-2" />
            <span>入所 {pet.daysInShelter} 天</span>
          </div>

          {/* 描述 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">關於 {pet.name}</h3>
            <p className="text-gray-700 leading-relaxed">{pet.description}</p>
          </div>

          {/* 個性特徵 */}
          {pet.personality?.traits && pet.personality.traits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">個性特徵</h3>
              <div className="flex flex-wrap gap-2">
                {pet.personality.traits.map((trait, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 認養按鈕 */}
          <div className="space-y-4">
            {/* 外部連結按鈕 (收容所寵物) */}
            {pet.externalLink && (
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2 mb-3">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  <h4 className="text-base font-semibold text-gray-900">收容所外部認養頁面</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  此寵物由收容所管理，請前往外部平台查看更多資訊或申請認養
                </p>
                <a
                  href={pet.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-block text-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                >
                  前往收容所頁面
                </a>
              </div>
            )}
            
            <button
              onClick={handleAdoptClick}
              className="w-full btn-primary py-3 text-lg font-semibold"
            >
              我想認養 {pet.name}
            </button>

            {/* Story 3.6: 助養按鈕 */}
            {pet.sponsorship?.enabled && pet.sponsorship?.externalLink && (
              <div className="border-2 border-orange-200 rounded-lg p-4 bg-gradient-to-r from-orange-50 to-yellow-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                    <h4 className="text-base font-semibold text-gray-900">助養此寵物</h4>
                  </div>
                  {pet.sponsorship.clickCount > 0 && (
                    <span className="text-sm text-gray-600">
                      已有 <span className="font-bold text-orange-600">{pet.sponsorship.clickCount}</span> 人助養
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  無法認養？您也可以透過助養方式支持 {pet.name}，讓我們能提供更好的照顧
                </p>
                <button
                  onClick={handleSponsorClick}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                >
                  前往助養平台
                </button>
              </div>
            )}

            {/* Story 3.2: 配對分析按鈕 */}
            {isAuthenticated && (
              <button
                onClick={() => setShowMatchAnalysis(true)}
                className="w-full btn-secondary py-3 text-lg font-semibold flex items-center justify-center gap-2"
              >
                <Target className="w-5 h-5" />
                查看配對分析
              </button>
            )}

            <p className="text-sm text-gray-500 text-center">
              認養費用：{pet.adoptionFee ? `NT$ ${pet.adoptionFee}` : '免費'}
            </p>
          </div>
        </div>
      </div>

      {/* 詳細資訊區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 健康狀況 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Stethoscope className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">健康狀況</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">疫苗接種</span>
              <span className={`font-medium ${pet.healthStatus?.vaccinated ? 'text-green-600' : 'text-red-600'}`}>
                {pet.healthStatus?.vaccinated ? '已完成' : '未完成'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">絕育手術</span>
              <span className={`font-medium ${pet.healthStatus?.spayed ? 'text-green-600' : 'text-red-600'}`}>
                {pet.healthStatus?.spayed ? '已完成' : '未完成'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">晶片植入</span>
              <span className={`font-medium ${pet.healthStatus?.microchipped ? 'text-green-600' : 'text-red-600'}`}>
                {pet.healthStatus?.microchipped ? '已植入' : '未植入'}
              </span>
            </div>
          </div>
        </div>

        {/* 適合對象 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <User className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">適合對象</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">適合有小孩的家庭</span>
              <span className={`font-medium ${
                pet.personality?.goodWith?.children === true ? 'text-green-600' : 
                pet.personality?.goodWith?.children === false ? 'text-red-600' : 'text-gray-500'
              }`}>
                {pet.personality?.goodWith?.children === true ? '適合' : 
                 pet.personality?.goodWith?.children === false ? '不適合' : '未知'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">適合其他寵物</span>
              <span className={`font-medium ${
                pet.personality?.goodWith?.otherPets === true ? 'text-green-600' : 
                pet.personality?.goodWith?.otherPets === false ? 'text-red-600' : 'text-gray-500'
              }`}>
                {pet.personality?.goodWith?.otherPets === true ? '適合' : 
                 pet.personality?.goodWith?.otherPets === false ? '不適合' : '未知'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">活動量需求</span>
              <span className="font-medium text-gray-900">
                {pet.personality?.activityLevel === 'high' ? '高' :
                 pet.personality?.activityLevel === 'moderate' ? '中等' :
                 pet.personality?.activityLevel === 'low' ? '低' : '未知'}
              </span>
            </div>
          </div>
        </div>

        {/* 收容資訊 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-6 h-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">收容資訊</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-gray-600 text-sm">入所日期</div>
              <div className="font-medium">
                {new Date(pet.shelterInfo?.intakeDate).toLocaleDateString('zh-TW')}
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">來源</div>
              <div className="font-medium">
                {pet.shelterInfo?.source === 'stray' ? '流浪動物' :
                 pet.shelterInfo?.source === 'owner-surrender' ? '飼主棄養' :
                 pet.shelterInfo?.source === 'transfer' ? '轉送' :
                 pet.shelterInfo?.source === 'born-in-shelter' ? '收容所出生' : '其他'}
              </div>
            </div>
            {pet.shelterInfo?.kennel && (
              <div>
                <div className="text-gray-600 text-sm">收容編號</div>
                <div className="font-medium">{pet.shelterInfo.kennel}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 故事（如果有） */}
      {pet.story && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{pet.name} 的故事</h3>
          <p className="text-gray-700 leading-relaxed">{pet.story}</p>
        </div>
      )}

      {/* 聯絡資訊 */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">有興趣認養嗎？</h3>
        <p className="text-gray-700 mb-4">
          如果您對 {pet.name} 有興趣，歡迎提交認養申請或透過私訊功能與送養者聯繫。
          我們會仔細評估每個申請，確保為 {pet.name} 找到最適合的家庭。
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleAdoptClick}
            className="btn-primary flex-1"
          >
            提交認養申請
          </button>
          {pet.createdBy && (pet.createdBy._id || pet.createdBy.id) && (() => {
            const creatorId = pet.createdBy._id || pet.createdBy.id;
            const token = localStorage.getItem('token');
            
            console.log('私訊按鈕調試:', {
              petName: pet.name,
              creatorId,
              hasToken: !!token,
              createdBy: pet.createdBy
            });
            
            if (!token) {
              // 未登入時也顯示按鈕，點擊時再提示登入
              return (
                <button
                  onClick={() => {
                    toast.error('請先登入');
                    navigate('/login');
                  }}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  私訊送養者
                </button>
              );
            }
            
            let currentUserId = null;
            let userRole = null;
            
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              currentUserId = payload.userId || payload._id || payload.id;
              userRole = payload.role;
              
              console.log('🔍 Token解析結果:', {
                currentUserId,
                userRole,
                creatorId,
                isMatch: currentUserId === creatorId,
                payload,
                warning: !userRole ? '⚠️ Token沒有role,請重新登入' : '✅ Token正常'
              });
            } catch (e) {
              console.error('解析token失敗:', e);
            }
            
            // 只有一般用戶且是自己的寵物才隱藏按鈕
            const isShelterOrAdmin = userRole === 'shelter' || userRole === 'admin';
            const shouldHide = currentUserId && creatorId === currentUserId && !isShelterOrAdmin;
            
            console.log('按鈕顯示邏輯:', { shouldHide, currentUserId, creatorId, isShelterOrAdmin });
            
            if (shouldHide) {
              console.log('❌ 隱藏按鈕');
              return null;
            }
            
            console.log('✅ 顯示按鈕');
            return (
              <button
                onClick={() => navigate(`/messages/${creatorId}`)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                私訊送養者
              </button>
            );
          })()}
        </div>
      </div>

      {/* Story 3.2: 配對分析 Modal */}
      {showMatchAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-purple-600" />
                與 {pet?.name} 的配對分析
              </h2>
              <button
                onClick={() => setShowMatchAnalysis(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {matchLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">正在分析配對度...</p>
                </div>
              ) : matchAnalysis ? (
                <MatchAnalysisPanel matchData={matchAnalysis} pet={pet} />
              ) : (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    完善您的檔案以取得配對分析
                  </h3>
                  <p className="text-gray-600 mb-6">
                    請先在個人資料頁面填寫生活方式、經驗和環境資訊，<br />
                    我們將為您提供詳細的配對分析。
                  </p>
                  <button
                    onClick={() => navigate('/profile')}
                    className="btn-primary"
                  >
                    前往設定檔案
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetDetailPage;