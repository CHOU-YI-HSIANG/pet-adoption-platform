import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const EmptyState = ({ 
  icon: Icon = Search, 
  title = '找不到符合條件的寵物',
  description = '試試調整篩選條件，或瀏覽所有寵物',
  actionText = '查看所有寵物',
  actionLink = '/pets',
  showAction = true 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>
      
      <p className="text-gray-600 text-center max-w-md mb-6">
        {description}
      </p>
      
      {showAction && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
