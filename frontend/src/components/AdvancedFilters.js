import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Button } from './ui';

/**
 * AdvancedFilters 進階篩選元件
 * Story 1.1: 提供性格、健康狀態、特殊需求、在收容所天數等進階篩選
 */
const AdvancedFilters = ({ filters, onFilterChange, onClearFilters, resultCount, totalCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // 性格特徵選項
  const personalityOptions = [
    { value: 'friendly', label: '親人' },
    { value: 'playful', label: '活潑' },
    { value: 'calm', label: '安靜' },
    { value: 'energetic', label: '精力充沛' },
    { value: 'independent', label: '獨立' },
    { value: 'social', label: '社交性強' },
    { value: 'shy', label: '害羞' },
    { value: 'gentle', label: '溫和' },
    { value: 'curious', label: '好奇' },
    { value: 'loyal', label: '忠誠' },
    { value: 'protective', label: '保護性強' },
    { value: 'affectionate', label: '親密' },
    { value: 'needs-training', label: '需要訓練' }
  ];

  // 健康狀態選項
  const healthOptions = [
    { value: 'vaccinated', label: '已接種疫苗' },
    { value: 'spayed', label: '已絕育' },
    { value: 'microchipped', label: '已植晶片' }
  ];

  // 特殊需求選項
  const specialNeedsOptions = [
    { value: 'goodWithChildren', label: '適合兒童' },
    { value: 'goodWithOtherPets', label: '適合其他寵物' }
  ];

  // 同步外部 filters 到本地狀態
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // 處理複選框變化
  const handleCheckboxChange = (category, value) => {
    const currentValues = localFilters[category] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    const newFilters = { ...localFilters, [category]: newValues };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // 處理單一布林值篩選
  const handleBooleanChange = (key, checked) => {
    const newFilters = { ...localFilters, [key]: checked ? 'true' : undefined };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // 處理滑桿變化
  const handleRangeChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // 清除所有篩選
  const handleClearAll = () => {
    setLocalFilters({});
    onClearFilters();
  };

  // 計算已啟用的篩選數量
  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.personality?.length > 0) count += localFilters.personality.length;
    if (localFilters.vaccinated === 'true') count++;
    if (localFilters.spayed === 'true') count++;
    if (localFilters.microchipped === 'true') count++;
    if (localFilters.goodWithChildren === 'true') count++;
    if (localFilters.goodWithOtherPets === 'true') count++;
    if (localFilters.daysInShelterMin || localFilters.daysInShelterMax) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className="advanced-filters">
      {/* 行動版：按鈕觸發 Modal */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          進階篩選 {activeCount > 0 && `(${activeCount})`}
        </Button>
      </div>

      {/* 桌面版：側邊欄 / 行動版：Modal */}
      <div className={`
        ${isOpen ? 'block' : 'hidden'} lg:block
        fixed lg:static inset-0 z-50 lg:z-auto
        bg-white lg:bg-transparent
        overflow-y-auto lg:overflow-visible
        p-6 lg:p-0
      `}>
        {/* 行動版遮罩 */}
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsOpen(false)}
        />

        {/* 篩選內容 */}
        <div className="bg-white rounded-lg shadow-lg lg:shadow-none p-6 space-y-6">
          {/* 標題與結果數 */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">進階篩選</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {resultCount !== undefined && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              顯示 <span className="font-semibold text-blue-600">{resultCount}</span> / {totalCount} 隻待認養寵物
            </div>
          )}

          {/* 性格特徵 */}
          <div className="filter-section">
            <h4 className="font-medium mb-3 text-gray-700">性格特徵</h4>
            <div className="space-y-2">
              {personalityOptions.map(option => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={(localFilters.personality || []).includes(option.value)}
                  onChange={(checked) => handleCheckboxChange('personality', option.value)}
                />
              ))}
            </div>
          </div>

          {/* 健康狀態 */}
          <div className="filter-section border-t pt-4">
            <h4 className="font-medium mb-3 text-gray-700">健康狀態</h4>
            <div className="space-y-2">
              {healthOptions.map(option => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={localFilters[option.value] === 'true'}
                  onChange={(checked) => handleBooleanChange(option.value, checked)}
                />
              ))}
            </div>
          </div>

          {/* 特殊需求 */}
          <div className="filter-section border-t pt-4">
            <h4 className="font-medium mb-3 text-gray-700">特殊需求</h4>
            <div className="space-y-2">
              {specialNeedsOptions.map(option => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={localFilters[option.value] === 'true'}
                  onChange={(checked) => handleBooleanChange(option.value, checked)}
                />
              ))}
            </div>
          </div>

          {/* 在收容所天數 */}
          <div className="filter-section border-t pt-4">
            <h4 className="font-medium mb-3 text-gray-700">在收容所天數</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  最少天數: {localFilters.daysInShelterMin || 0} 天
                </label>
                <input
                  type="range"
                  min="0"
                  max="365"
                  step="30"
                  value={localFilters.daysInShelterMin || 0}
                  onChange={(e) => handleRangeChange('daysInShelterMin', e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  最多天數: {localFilters.daysInShelterMax || 365} 天
                </label>
                <input
                  type="range"
                  min="0"
                  max="365"
                  step="30"
                  value={localFilters.daysInShelterMax || 365}
                  onChange={(e) => handleRangeChange('daysInShelterMax', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 清除按鈕 */}
          {activeCount > 0 && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="w-full"
            >
              清除所有篩選
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

AdvancedFilters.propTypes = {
  filters: PropTypes.object,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  resultCount: PropTypes.number,
  totalCount: PropTypes.number
};

AdvancedFilters.defaultProps = {
  filters: {},
  resultCount: 0,
  totalCount: 0
};

export default AdvancedFilters;
