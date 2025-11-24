import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, User, Calendar, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';

const PostCard = ({ post, index = 0 }) => {
  const getTypeLabel = (type) => {
    const labels = {
      'general': '一般',
      'lost-pet': '走失寵物',
      'found-pet': '發現寵物',
      'adoption-story': '領養故事'
    };
    return labels[type] || type;
  };

  const getTypeBadgeClass = (type) => {
    const classes = {
      'general': 'bg-blue-100 text-blue-700',
      'lost-pet': 'bg-red-100 text-red-700',
      'found-pet': 'bg-green-100 text-green-700',
      'adoption-story': 'bg-purple-100 text-purple-700'
    };
    return classes[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
    >
      <Link to={`/community/${post._id}`} className="block">
        {/* 貼文圖片 */}
        {post.images && post.images.length > 0 && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={post.images[0].url}
              alt={post.images[0].alt || post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            {/* 類型徽章 */}
            <div className="absolute top-3 right-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(post.type)}`}>
                {getTypeLabel(post.type)}
              </span>
            </div>
          </div>
        )}

        {/* 貼文內容 */}
        <div className="p-5">
          {/* 作者資訊 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {post.author?.firstName} {post.author?.lastName}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {new Date(post.createdAt).toLocaleDateString('zh-TW')}
              </div>
            </div>
          </div>

          {/* 標題 */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-purple-600 transition-colors">
            {post.title}
          </h3>

          {/* 摘要 */}
          <p className="text-gray-600 text-sm line-clamp-3 mb-4">
            {post.excerpt || post.content?.substring(0, 100)}
            {(post.excerpt?.length > 100 || post.content?.length > 100) && '...'}
          </p>

          {/* 互動數據 */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <LikeButton 
                postId={post._id}
                initialLiked={post.isLiked || false}
                initialCount={post.stats?.likes || 0}
              />
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{post.stats?.comments || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{post.stats?.views || 0}</span>
              </div>
            </div>
            
            <SaveButton 
              postId={post._id}
              initialSaved={post.isSaved || false}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default PostCard;
