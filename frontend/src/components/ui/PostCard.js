import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import UserAvatar from './UserAvatar';

const PostCard = ({ post, className = '' }) => {
  const navigate = useNavigate();

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      onClick={() => navigate(`/posts/${post._id}`)}
      className={`bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <UserAvatar user={post.author} size="md" />
        <div>
          <p className="font-medium text-gray-800">{post.author?.username}</p>
          <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-800 mb-2">{post.title}</h3>
      <p className="text-gray-600 mb-4 line-clamp-3">{post.content}</p>

      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {post.images.slice(0, 4).map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Post ${index + 1}`}
              className="w-full h-32 object-cover rounded"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>👍 {post.likes?.length || 0} 個讚</span>
        <span>💬 {post.comments?.length || 0} 則留言</span>
      </div>
    </div>
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    author: PropTypes.shape({
      _id: PropTypes.string,
      username: PropTypes.string,
      avatar: PropTypes.string,
    }),
    images: PropTypes.arrayOf(PropTypes.string),
    likes: PropTypes.array,
    comments: PropTypes.array,
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  className: PropTypes.string,
};

export default PostCard;
