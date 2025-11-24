import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { petAPI } from '../services/api';
import { useAuth } from '../services/auth';
import useDebounce from '../hooks/useDebounce';
import AdvancedFilters from '../components/AdvancedFilters';
import FilterSkeleton from '../components/FilterSkeleton';
import PetCardSkeleton from '../components/PetCardSkeleton';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  Heart, 
  MapPin, 
  Calendar,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const PetsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const queryClient = useQueryClient();
  
  // 從 URL 參數初始化篩選條件
  const getInitialFilters = () => {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'personality') {
        params[key] = searchParams.getAll('personality');
      } else {
        params[key] = value;
      }
    }
    return {
      search: params.search || '',
      species: params.species || '',
      size: params.size || '',
      ageCategory: params.ageCategory || '',
      age: params.age || '',
      
      gender: params.gender || '',
      location: params.location || '',
      // Story 1.1: 進階篩選
      personality: params.personality || [],
      vaccinated: params.vaccinated,
      spayed: params.spayed,
      microchipped: params.microchipped,
      goodWithChildren: params.goodWithChildren,
      goodWithOtherPets: params.goodWithOtherPets,
      daysInShelterMin: params.daysInShelterMin,
      daysInShelterMax: params.daysInShelterMax,
    };
  };

  const [filters, setFilters] = useState(getInitialFilters());
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // 獲取收藏列表
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isAuthenticated) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/users/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const favoritePetIds = (data.data.favorites || []).map(pet => pet._id);
          setFavorites(favoritePetIds);
        }
      } catch (error) {
        console.error('獲取收藏列表失敗:', error);
      }
    };

    fetchFavorites();
  }, [isAuthenticated]);

  // 處理收藏按鈕點擊
  const handleToggleFavorite = async (e, petId) => {
    e.preventDefault(); // 阻止導航到詳情頁
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('請先登入');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/favorites/${petId}`, {
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
      
      // 更新本地收藏狀態
      if (data.data.favorited) {
        setFavorites(prev => [...prev, petId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== petId));
      }
      
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

  // 使用 debounce 減少 API 請求頻率
  const debouncedFilters = useDebounce(filters, 300);

  // 同步篩選條件到 URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => params.append(key, v));
        } else if (!Array.isArray(value)) {
          params.set(key, value);
        }
      }
    });
    
    if (page > 1) params.set('page', page);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    
    setSearchParams(params, { replace: true });
  }, [debouncedFilters, page, sortBy, sortOrder, setSearchParams]);

  // 取得寵物列表
  const { data: petsData, isLoading, error } = useQuery(
    ['pets', debouncedFilters, page, sortBy, sortOrder],
    () => {
      // 只傳送有值的參數，避免空字串導致驗證錯誤
      const params = {
        page,
        sortBy,
        sortOrder,
        limit: 12,
      };
      
      // 只加入非空字串的篩選條件
      if (debouncedFilters.search) params.search = debouncedFilters.search;
      if (debouncedFilters.species) params.species = debouncedFilters.species;
      if (debouncedFilters.size) params.size = debouncedFilters.size;
      if (debouncedFilters.ageCategory) params.ageCategory = debouncedFilters.ageCategory;
      if (debouncedFilters.age) params.age = debouncedFilters.age;
      if (debouncedFilters.gender) params.gender = debouncedFilters.gender;
      if (debouncedFilters.location) params.location = debouncedFilters.location;
      if (debouncedFilters.personality?.length > 0) params.personality = debouncedFilters.personality;
      
      // 進階篩選參數
      if (debouncedFilters.vaccinated !== undefined) params.vaccinated = debouncedFilters.vaccinated;
      if (debouncedFilters.spayed !== undefined) params.spayed = debouncedFilters.spayed;
      if (debouncedFilters.microchipped !== undefined) params.microchipped = debouncedFilters.microchipped;
      if (debouncedFilters.goodWithChildren !== undefined) params.goodWithChildren = debouncedFilters.goodWithChildren;
      if (debouncedFilters.goodWithOtherPets !== undefined) params.goodWithOtherPets = debouncedFilters.goodWithOtherPets;
      if (debouncedFilters.daysInShelterMin !== undefined && debouncedFilters.daysInShelterMin !== '') params.daysInShelterMin = debouncedFilters.daysInShelterMin;
      if (debouncedFilters.daysInShelterMax !== undefined && debouncedFilters.daysInShelterMax !== '') params.daysInShelterMax = debouncedFilters.daysInShelterMax;
      
      return petAPI.getPets(params);
    },
    {
      select: (response) => response.data,
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // 重設到第一頁
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: '',
      species: '',
      size: '',
      ageCategory: '',
      age: '',
      gender: '',
      location: '',
      personality: [],
      vaccinated: undefined,
      spayed: undefined,
      microchipped: undefined,
      goodWithChildren: undefined,
      goodWithOtherPets: undefined,
      daysInShelterMin: undefined,
      daysInShelterMax: undefined,
    };
    setFilters(emptyFilters);
    setPage(1);
  };

  // Story 1.1: 處理進階篩選變化
  const handleAdvancedFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const speciesOptions = [
    { value: 'dog', label: '狗' },
    { value: 'cat', label: '貓' },
    { value: 'rabbit', label: '兔子' },
    { value: 'bird', label: '鳥' },
    { value: 'hamster', label: '倉鼠' },
    { value: 'guinea-pig', label: '天竺鼠' },
    { value: 'other', label: '其他' },
  ];

  const sizeOptions = [
    { value: 'small', label: '小型' },
    { value: 'medium', label: '中型' },
    { value: 'large', label: '大型' },
    { value: 'extra-large', label: '超大型' },
  ];

  const ageOptions = [
    { value: 'young', label: '幼年' },
    { value: 'adult', label: '成年' },
    { value: 'senior', label: '老年' },
  ];

  // combined age options: 1個月..12個月, 1歲..50歲
  // 使用中文單位傳給後端 (例如: "3個月", "2歲")
  const ageCombinedOptions = [
    ...Array.from({ length: 12 }).map((_, i) => ({ value: `${i + 1}個月`, label: `${i + 1}個月` })),
    ...Array.from({ length: 50 }).map((_, i) => ({ value: `${i + 1}歲`, label: `${i + 1}歲` })),
  ];

  const genderOptions = [
    { value: 'male', label: '公' },
    { value: 'female', label: '母' },
  ];

  const sortOptions = [
    { value: 'createdAt-desc', label: '最新上架' },
    { value: 'createdAt-asc', label: '最早上架' },
    { value: 'age-asc', label: '年齡由小到大' },
    { value: 'age-desc', label: '年齡由大到小' },
    { value: 'name-asc', label: '名字 A-Z' },
    { value: 'name-desc', label: '名字 Z-A' },
  ];

  const handleSortChange = (value) => {
    const [field, order] = value.split('-');
    setSortBy(field);
    setSortOrder(order);
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">載入失敗</h2>
          <p className="text-gray-600 mb-4">無法載入寵物資料，請稍後再試。</p>
          <details className="text-left max-w-2xl mx-auto bg-red-50 p-4 rounded-lg">
            <summary className="cursor-pointer text-red-600 font-semibold mb-2">查看錯誤詳情</summary>
            <pre className="text-sm text-red-800 overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
            <p className="mt-2 text-sm text-gray-600">
              錯誤訊息: {error?.message || '未知錯誤'}
            </p>
            {error?.response && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">HTTP 狀態: {error.response.status}</p>
                <p className="text-sm text-gray-600">回應: {JSON.stringify(error.response.data)}</p>
              </div>
            )}
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Story 1.1: 左側進階篩選欄 (桌面版) */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          {isLoading ? (
            <FilterSkeleton />
          ) : (
            <AdvancedFilters
              filters={filters}
              onFilterChange={handleAdvancedFilterChange}
              onClearFilters={clearFilters}
              resultCount={petsData?.pagination?.totalItems}
              totalCount={petsData?.pagination?.totalItems}
            />
          )}
        </aside>

        {/* 主內容區 */}
        <main className="flex-1 min-w-0">
          {/* 頁面標題 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">尋找毛小孩</h1>
            <p className="text-gray-600">
              瀏覽我們的可愛動物，找到您的完美伴侶
            </p>
          </div>

          {/* Story 1.5: 行動版進階篩選按鈕 (含摺疊動畫) */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="btn-secondary w-full inline-flex items-center justify-between"
            >
              <span className="inline-flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                進階篩選
                {petsData?.pagination?.totalItems && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {petsData.pagination.totalItems} 個結果
                  </span>
                )}
              </span>
              {showAdvancedFilters ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {/* Story 1.5: 摺疊面板動畫 */}
            {showAdvancedFilters && (
              <div className="mt-4 overflow-hidden animate-slideDown">
                <AdvancedFilters
                  filters={filters}
                  onFilterChange={handleAdvancedFilterChange}
                  onClearFilters={clearFilters}
                  resultCount={petsData?.pagination?.totalItems}
                  totalCount={petsData?.pagination?.totalItems}
                />
              </div>
            )}
          </div>

      {/* 搜尋和篩選區域 */}
      <div className="mb-8">
        {/* 搜尋欄 */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋動物名稱、品種..."
              className="input-field pl-10"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary inline-flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              篩選
            </button>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="input-field min-w-[150px]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 篩選器 */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">篩選條件</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="form-label">動物種類</label>
                <select
                  value={filters.species}
                  onChange={(e) => handleFilterChange('species', e.target.value)}
                  className="input-field"
                >
                  <option value="">所有種類</option>
                  {speciesOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">體型大小</label>
                <select
                  value={filters.size}
                  onChange={(e) => handleFilterChange('size', e.target.value)}
                  className="input-field"
                >
                  <option value="">所有體型</option>
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">年齡</label>
                <select
                  value={filters.age}
                  onChange={(e) => handleFilterChange('age', e.target.value)}
                  className="input-field"
                >
                  <option value="">所有年齡</option>
                  {ageCombinedOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">性別</label>
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  className="input-field"
                >
                  <option value="">所有性別</option>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">所在地點</label>
                <input
                  type="text"
                  placeholder="城市或地區"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="btn-secondary mr-2"
              >
                清除篩選
              </button>
            </div>
          </div>
        )}

        {/* 篩選標籤 */}
        {Object.entries(filters).some(([key, value]) => 
          (Array.isArray(value) && value.length > 0) || (!Array.isArray(value) && value)
        ) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(filters).map(([key, value]) => {
              // 處理陣列類型（personality）
              if (Array.isArray(value) && value.length > 0) {
                return value.map((item, index) => (
                  <span
                    key={`${key}-${index}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {item}
                    <button
                      onClick={() => {
                        const newValue = value.filter(v => v !== item);
                        handleFilterChange(key, newValue);
                      }}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ));
              }
              
              // 處理一般值
              if (!value) return null;
              
              let label = value;
              if (key === 'species') {
                label = speciesOptions.find(o => o.value === value)?.label || value;
              } else if (key === 'size') {
                label = sizeOptions.find(o => o.value === value)?.label || value;
              } else if (key === 'ageCategory') {
                label = ageOptions.find(o => o.value === value)?.label || value;
              } else if (key === 'gender') {
                label = genderOptions.find(o => o.value === value)?.label || value;
              }
              
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                >
                  {label}
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="ml-2 text-primary-600 hover:text-primary-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 寵物列表 */}
      {isLoading ? (
        <div>
          {/* Story 1.5: 結果計數骨架 */}
          <div className="mb-6">
            <div className="h-5 bg-gray-300 rounded w-48 animate-pulse"></div>
          </div>
          {/* Story 1.5: 使用 PetCardSkeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <PetCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : petsData?.pets?.length > 0 ? (
        <>
          {/* Story 1.5: 結果計數顯示 */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              顯示 <span className="font-semibold text-gray-900">{petsData.pets.length}</span> / 
              <span className="font-semibold text-gray-900"> {petsData.pagination.totalItems}</span> 隻待認養寵物
            </p>
            <p className="text-sm text-gray-500">
              第 {petsData.pagination.currentPage} 頁，共 {petsData.pagination.totalPages} 頁
            </p>
          </div>

          {/* 寵物卡片網格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {petsData.pets.map((pet) => (
              <Link
                key={pet._id}
                to={`/pets/${pet._id}`}
                className="card-hover pet-card group"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={pet.photos?.[0]?.url || (pet.photos && pet.photos.length > 0 ? pet.photos.find(p => p.isPrimary)?.url : null) || '/placeholder-pet.jpg'}
                    alt={pet.name}
                    className="pet-image group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => { e.target.src = '/placeholder-pet.jpg'; }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="status-available">可認養</span>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    {/* 品種標籤 */}
                    <span className="bg-purple-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded-full">
                      {pet.breed}
                    </span>
                    {/* 性別標籤 */}
                    {pet.gender && (
                      <span className="bg-white bg-opacity-90 rounded-full px-2 py-1">
                        <span className="text-sm font-medium text-gray-800">
                          {pet.gender === '公' || pet.gender === 'male' ? '♂' : '♀'}
                        </span>
                      </span>
                    )}
                  </div>
                  {/* 狀態標籤 */}
                  {pet.tags && pet.tags.length > 0 && (
                    <div className="absolute bottom-4 left-4 flex flex-wrap gap-1">
                      {pet.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx}
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            tag.includes('已認養') ? 'bg-green-500 text-white' :
                            tag.includes('審核中') ? 'bg-yellow-500 text-white' :
                            tag.includes('待認養') ? 'bg-blue-500 text-white' :
                            'bg-gray-600 bg-opacity-80 text-white'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4">
                    <button 
                      onClick={(e) => handleToggleFavorite(e, pet._id)}
                      className={`rounded-full p-2 transition-colors ${
                        favorites.includes(pet._id)
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-white bg-opacity-90 hover:bg-white'
                      }`}
                    >
                      <Heart 
                        className={`w-4 h-4 ${
                          favorites.includes(pet._id)
                            ? 'text-white fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {pet.name}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <p>{pet.breed} • {pet.ageDescription}</p>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {pet.shelterInfo?.location}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      入所 {pet.daysInShelter} 天
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm line-clamp-2 mb-4">
                    {pet.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-600 font-semibold">
                      了解更多
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 分頁 */}
          {petsData.pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!petsData.pagination.hasPrevPage}
                className="pagination-btn"
              >
                上一頁
              </button>
              
              {[...Array(petsData.pagination.totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 ||
                  pageNum === petsData.pagination.totalPages ||
                  (pageNum >= page - 2 && pageNum <= page + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`pagination-btn ${pageNum === page ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === page - 3 ||
                  pageNum === page + 3
                ) {
                  return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => setPage(page + 1)}
                disabled={!petsData.pagination.hasNextPage}
                className="pagination-btn"
              >
                下一頁
              </button>
            </div>
          )}
        </>
      ) : (
        /* Story 1.5: 使用 EmptyState 元件 */
        <div>
          <EmptyState
            icon={Search}
            title="找不到符合條件的寵物"
            description="試試調整篩選條件，或清除所有篩選重新開始"
            actionText="清除所有篩選"
            showAction={false}
          />
          <div className="text-center mt-4">
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              清除所有篩選
            </button>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
};

export default PetsPage;