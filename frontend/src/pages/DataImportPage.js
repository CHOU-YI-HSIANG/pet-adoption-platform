import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Upload, 
  Database, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader,
  Search,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const DataImportPage = () => {
  const [activeTab, setActiveTab] = useState('animals'); // 'animals' or 'shops'
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // 動物資料
  const [animals, setAnimals] = useState([]);
  const [selectedAnimals, setSelectedAnimals] = useState(new Set());
  const [animalFilters, setAnimalFilters] = useState({
    county: '',
    status: '',
    page: 1,
    limit: 100,  // 一次載入 100 筆
    skip: 0      // 跳過的筆數（0=第1-100筆, 100=第101-200筆）
  });
  
  // 寵物店資料
  const [petShops, setPetShops] = useState([]);
  const [shopFilters, setShopFilters] = useState({
    county: '',
    page: 1,
    limit: 20
  });
  
  // 匯入結果
  const [importResults, setImportResults] = useState(null);

  // 台灣縣市列表
  const counties = [
    '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣',
    '苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣', '嘉義市',
    '嘉義縣', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣',
    '臺東縣', '澎湖縣', '金門縣', '連江縣'
  ];

  // 獲取動物認領養資料
  const fetchAnimals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (animalFilters.county) params.append('county', animalFilters.county);
      if (animalFilters.status) params.append('status', animalFilters.status);
      params.append('limit', animalFilters.limit);
      params.append('skip', animalFilters.skip);  // 使用 skip 而非 page

      const response = await fetch(
        `http://localhost:5000/api/data-import/animal-recognition?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setAnimals(data.data.animals);
        toast.success(`成功載入 ${data.data.animals.length} 筆動物資料`);
      } else {
        throw new Error(data.error.message);
      }
    } catch (error) {
      console.error('載入動物資料失敗:', error);
      toast.error('載入動物資料失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 獲取合法寵物業名單
  const fetchPetShops = async () => {
    try {
      setLoading(true);
      // Helper: 只取日期部分（YYYY-MM-DD），對各種 raw 格式做防護
      const extractDatePart = (raw) => {
        if (!raw && raw !== 0) return '';
        try {
          // Date instance
          if (raw instanceof Date) return raw.toISOString().split('T')[0];
          // number (timestamp)
          if (typeof raw === 'number') {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
          }
          if (typeof raw === 'string') {
            const s = raw.trim();
            // Try direct parse first
            const d1 = new Date(s);
            if (!isNaN(d1.getTime())) return d1.toISOString().split('T')[0];

            // Try to extract YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
            let m = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
            if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

            // Try M/D/YYYY or M-D-YYYY
            m = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
            if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;

            // If contains a sequence like 20210730 or 2021/07/30 with extra text, try to find first 8-10 digit group
            m = s.match(/(\d{4})(\d{2})(\d{2})/);
            if (m) return `${m[1]}-${m[2]}-${m[3]}`;

            return '';
          }
        } catch (e) {
          return '';
        }
        return '';
      };
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (shopFilters.county) params.append('county', shopFilters.county);
      params.append('page', shopFilters.page);
      params.append('limit', shopFilters.limit);

      // 先從本地已匯入的資料庫讀取（若要改為即時政府 API，改回原 endpoint）
      const response = await fetch(
        `http://localhost:5000/api/data-import/legal-pet-shops-db?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // 從 DB 讀出來的欄位為英文命名 (e.g. name, address, validNumber)
        // 前端 table 原本期待政府 API 的中文欄位 (業者名稱, 統一編號, 業者地址, 電話)
        // 這裡做一層映射，確保畫面能正常顯示已匯入的資料
        const mapped = (data.data.shops || []).map(s => ({
          // 保留原始資料
          ...s,
          '業者名稱': s.name || s.業者名稱 || (s.originalData && (s.originalData.legalname || s.originalData.業者名稱)) || '',
          '統一編號': s.validNumber || s.統一編號 || (s.originalData && (s.originalData.validnum || s.originalData.統一編號)) || '',
          '業者地址': s.address || s.業者地址 || (s.originalData && (s.originalData.legaladdress || s.originalData.業者地址)) || '',
          // validdate 優先使用政府資料的 originalData.validdate（資料集的 validdate），若無才回退到 validDate 或 importedAt
          'validdate': (function(){
            const v1 = s && s.originalData && s.originalData.validdate;
            const v2 = s && s.validDate;
            const v3 = s && s.importedAt;
            return extractDatePart(v1) || extractDatePart(v2) || extractDatePart(v3) || '';
          })(),
          // own_name 顯示為擁有人
          'own_name': s.ownerName || s.own_name || (s.originalData && (s.originalData.own_name || s.originalData.擁有人)) || ''
        }));

        setPetShops(mapped);
        toast.success(`成功載入 ${mapped.length} 筆寵物業資料`);
      } else {
        throw new Error(data.error.message);
      }
    } catch (error) {
      console.error('載入寵物業資料失敗:', error);
      toast.error('載入寵物業資料失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 匯入選中的動物
  const importSelectedAnimals = async () => {
    if (selectedAnimals.size === 0) {
      toast.error('請至少選擇一筆資料');
      return;
    }

    try {
      setImporting(true);
      const token = localStorage.getItem('token');
      const selectedData = animals.filter(animal => 
        selectedAnimals.has(animal.animal_id)
      );

      const response = await fetch(
        'http://localhost:5000/api/data-import/import-animals',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ animals: selectedData })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setImportResults(data.data);
        toast.success(`成功匯入 ${data.data.imported} 筆資料`);
        setSelectedAnimals(new Set());
      } else {
        throw new Error(data.error.message);
      }
    } catch (error) {
      console.error('匯入失敗:', error);
      toast.error('匯入失敗: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // 切換選擇
  const toggleAnimalSelection = (animalId) => {
    const newSelection = new Set(selectedAnimals);
    if (newSelection.has(animalId)) {
      newSelection.delete(animalId);
    } else {
      newSelection.add(animalId);
    }
    setSelectedAnimals(newSelection);
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedAnimals.size === animals.length) {
      setSelectedAnimals(new Set());
    } else {
      setSelectedAnimals(new Set(animals.map(a => a.animal_id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 標題 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Database className="inline-block w-8 h-8 mr-2 mb-1" />
            政府開放資料匯入
          </h1>
          <p className="text-gray-600">
            從農業部「動物認領養」資料集匯入流浪動物資料
          </p>
        </motion.div>

        {/* Tab 切換 */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('animals')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'animals'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Download className="inline-block w-5 h-5 mr-2 mb-1" />
                動物認領養資料
              </button>
              <button
                onClick={() => setActiveTab('shops')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'shops'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Info className="inline-block w-5 h-5 mr-2 mb-1" />
                合法特定寵物業名單
              </button>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'animals' ? (
                <AnimalImportTab
                  key="animals"
                  animals={animals}
                  selectedAnimals={selectedAnimals}
                  filters={animalFilters}
                  setFilters={setAnimalFilters}
                  counties={counties}
                  loading={loading}
                  importing={importing}
                  onFetch={fetchAnimals}
                  onImport={importSelectedAnimals}
                  onToggleSelection={toggleAnimalSelection}
                  onToggleSelectAll={toggleSelectAll}
                  importResults={importResults}
                />
              ) : (
                <PetShopTab
                  key="shops"
                  petShops={petShops}
                  filters={shopFilters}
                  setFilters={setShopFilters}
                  counties={counties}
                  loading={loading}
                  onFetch={fetchPetShops}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

// 動物認領養分頁
const AnimalImportTab = ({
  animals,
  selectedAnimals,
  filters,
  setFilters,
  counties,
  loading,
  importing,
  onFetch,
  onImport,
  onToggleSelection,
  onToggleSelectAll,
  importResults
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 篩選器 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            縣市
          </label>
          <select
            value={filters.county}
            onChange={(e) => setFilters({ ...filters, county: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <option value="">全部縣市</option>
            {counties.map(county => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            狀態
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <option value="">全部狀態</option>
            <option value="開放認養">開放認養</option>
            <option value="已認養">已認養</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            資料批次
          </label>
          <select
            value={filters.skip}
            onChange={(e) => setFilters({ ...filters, skip: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <option value="0">第 1-100 筆</option>
            <option value="100">第 101-200 筆</option>
            <option value="200">第 201-300 筆</option>
            <option value="300">第 301-400 筆</option>
            <option value="400">第 401-500 筆</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            每批數量
          </label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <option value="50">50 筆</option>
            <option value="100">100 筆</option>
            <option value="150">150 筆</option>
            <option value="200">200 筆</option>
          </select>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={onFetch}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              載入中...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              載入資料
            </>
          )}
        </button>

        {animals.length > 0 && (
          <>
            <button
              onClick={onToggleSelectAll}
              className="btn-secondary flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {selectedAnimals.size === animals.length ? '取消全選' : '全選'}
            </button>

            <button
              onClick={onImport}
              disabled={importing || selectedAnimals.size === 0}
              className="btn-primary flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  匯入中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  匯入選中 ({selectedAnimals.size})
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* 匯入結果 */}
      {importResults && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
        >
          <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            匯入完成
          </h3>
          <div className="text-sm text-green-800 space-y-1">
            <p>✅ 成功匯入: {importResults.imported} 筆</p>
            <p>⏭️ 已跳過（重複）: {importResults.skipped} 筆</p>
            <p>❌ 失敗: {importResults.failed} 筆</p>
          </div>
        </motion.div>
      )}

      {/* 動物列表 */}
      {animals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {animals.map(animal => (
            <AnimalCard
              key={animal.animal_id}
              animal={animal}
              isSelected={selectedAnimals.has(animal.animal_id)}
              onToggle={() => onToggleSelection(animal.animal_id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>點擊「載入資料」開始獲取政府開放資料</p>
        </div>
      )}
    </motion.div>
  );
};

// 動物卡片
const AnimalCard = ({ animal, isSelected, onToggle }) => {
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    if (status.includes('開放')) return 'bg-green-100 text-green-800';
    if (status.includes('已認養')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'border-purple-600 shadow-lg' : 'border-gray-200 hover:border-purple-300'
      }`}
      onClick={onToggle}
    >
      {/* 照片 */}
      <div className="relative h-48 bg-gray-200">
        {animal.album_file ? (
          <img
            src={animal.album_file}
            alt={animal.animal_Variety}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            無照片
          </div>
        )}
        
        {/* 選擇指示器 */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-2">
            <CheckCircle className="w-5 h-5" />
          </div>
        )}
        
        {/* 狀態標籤 */}
        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(animal.animal_status)}`}>
          {animal.animal_status || '未知'}
        </div>
      </div>

      {/* 資訊 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          {animal.animal_Variety || '未命名'}
        </h3>
        <div className="space-y-1 text-sm text-gray-600">
          <p>📋 收容編號: {animal.animal_id}</p>
          <p>📍 地點: {animal.animal_place}</p>
          <p>🏢 收容所: {animal.shelter_name}</p>
          <p>🔢 性別: {animal.animal_sex === 'M' ? '公' : animal.animal_sex === 'F' ? '母' : '未知'}</p>
          <p>📅 開放日期: {animal.animal_opendate?.split(' ')[0] || '未提供'}</p>
        </div>
      </div>
    </motion.div>
  );
};

// 寵物店分頁
const PetShopTab = ({ petShops, filters, setFilters, counties, loading, onFetch }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 篩選器 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            縣市
          </label>
          <select
            value={filters.county}
            onChange={(e) => setFilters({ ...filters, county: e.target.value, page: 1 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <option value="">全部縣市</option>
            {counties.map(county => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            每頁顯示
          </label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <option value="20">20 筆</option>
            <option value="50">50 筆</option>
            <option value="100">100 筆</option>
          </select>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="mb-6">
        <button
          onClick={onFetch}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              載入中...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              載入資料
            </>
          )}
        </button>
      </div>

      {/* 寵物店列表 */}
      {petShops.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  業者名稱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  統一編號
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  創建日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  擁有人
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {petShops.map((shop, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {shop.業者名稱}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shop.統一編號}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {shop.業者地址}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shop.validdate || '未提供'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shop.own_name || '未提供'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>點擊「載入資料」開始獲取合法寵物業名單</p>
        </div>
      )}
    </motion.div>
  );
};

export default DataImportPage;