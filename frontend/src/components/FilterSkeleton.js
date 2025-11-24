import React from 'react';
import { Skeleton } from './ui';

/**
 * FilterSkeleton 篩選載入骨架元件
 * Story 1.1: 在載入篩選結果時顯示
 */
const FilterSkeleton = () => {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* 標題骨架 */}
      <Skeleton className="h-6 w-32" />
      
      {/* 結果數骨架 */}
      <Skeleton className="h-12 w-full" />

      {/* 篩選組骨架 x3 */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 滑桿骨架 */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>

      {/* 按鈕骨架 */}
      <Skeleton className="h-10 w-full" />
    </div>
  );
};

export default FilterSkeleton;
