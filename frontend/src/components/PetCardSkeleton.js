import React from 'react';

const PetCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      {/* 圖片骨架 */}
      <div className="w-full h-48 bg-gray-300"></div>
      
      {/* 內容骨架 */}
      <div className="p-4 space-y-3">
        {/* 標題 */}
        <div className="h-6 bg-gray-300 rounded w-3/4"></div>
        
        {/* 描述行 */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        
        {/* 標籤 */}
        <div className="flex gap-2 pt-2">
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          <div className="h-6 bg-gray-200 rounded-full w-14"></div>
        </div>
        
        {/* 按鈕 */}
        <div className="h-10 bg-gray-300 rounded mt-4"></div>
      </div>
    </div>
  );
};

export default PetCardSkeleton;
