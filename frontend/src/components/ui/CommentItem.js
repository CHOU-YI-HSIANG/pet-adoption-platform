import React from 'react';
import PropTypes from 'prop-types';
import UserAvatar from './UserAvatar';

const CommentItem = ({ comment, onDelete, currentUserId, className = '' }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOwner = currentUserId === comment.author?._id;

  return (
    <div className={`flex gap-3 py-4 border-b border-gray-200 last:border-0 ${className}`}>
      <UserAvatar user={comment.author} size="sm" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-gray-800">{comment.author?.username}</p>
          <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
        </div>
        <p className="text-gray-600">{comment.content}</p>
        {isOwner && onDelete && (
          <button
            onClick={() => onDelete(comment._id)}
            className="mt-2 text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            刪除
          </button>
        )}
      </div>
    </div>
  );
};

CommentItem.propTypes = {
  comment: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    author: PropTypes.shape({
      _id: PropTypes.string,
      username: PropTypes.string,
      avatar: PropTypes.string,
    }),
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  onDelete: PropTypes.func,
  currentUserId: PropTypes.string,
  className: PropTypes.string,
};

export default CommentItem;
