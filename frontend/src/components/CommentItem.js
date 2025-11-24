import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Heart, CornerDownRight, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../services/auth';
import CommentForm from './CommentForm';

const CommentItem = ({ comment, postId, isReply = false }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [liked, setLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likes || 0);

  const isAuthor = user?.id === comment.author?._id;

  // 獲取回覆列表
  const { data: repliesData } = useQuery(
    ['replies', comment._id],
    async () => {
      const response = await fetch(
        `http://localhost:5000/api/comments/${comment._id}/replies`
      );
      if (!response.ok) throw new Error('載入失敗');
      return response.json();
    },
    {
      enabled: showReplies && !isReply,
      select: (response) => response.data
    }
  );

  // 回覆留言
  const replyMutation = useMutation(
    async (content) => {
      const response = await fetch(`http://localhost:5000/api/comments/${comment._id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '回覆失敗');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('回覆發布成功');
        setShowReplyForm(false);
        queryClient.invalidateQueries(['replies', comment._id]);
        queryClient.invalidateQueries(['comments', postId]);
      },
      onError: (error) => {
        toast.error(error.message || '回覆失敗');
      }
    }
  );

  // 編輯留言
  const editMutation = useMutation(
    async (content) => {
      const response = await fetch(`http://localhost:5000/api/comments/${comment._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '編輯失敗');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('留言已更新');
        setIsEditing(false);
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['replies', comment.parentComment]);
      },
      onError: (error) => {
        toast.error(error.message || '編輯失敗');
      }
    }
  );

  // 刪除留言
  const deleteMutation = useMutation(
    async () => {
      const response = await fetch(`http://localhost:5000/api/comments/${comment._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '刪除失敗');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('留言已刪除');
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['replies', comment.parentComment]);
      },
      onError: (error) => {
        toast.error(error.message || '刪除失敗');
      }
    }
  );

  // 按讚留言
  const likeMutation = useMutation(
    async () => {
      const response = await fetch(`http://localhost:5000/api/comments/${comment._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('操作失敗');
      return response.json();
    },
    {
      onMutate: async () => {
        // 樂觀更新
        setLiked(!liked);
        setLikesCount(liked ? likesCount - 1 : likesCount + 1);
      },
      onSuccess: (data) => {
        // 使用伺服器返回的真實數據
        if (data.data) {
          setLiked(data.data.liked);
          setLikesCount(data.data.likesCount);
        }
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['replies', comment.parentComment]);
      },
      onError: (error) => {
        // 回滾
        setLiked(liked);
        setLikesCount(likesCount);
        toast.error(error.message || '操作失敗');
      }
    }
  );

  const handleReplySubmit = (content) => {
    replyMutation.mutate(content);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    editMutation.mutate(editContent.trim());
  };

  const handleDelete = () => {
    if (window.confirm('確定要刪除這則留言嗎？')) {
      deleteMutation.mutate();
    }
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error('請先登入才能按讚');
      return;
    }
    likeMutation.mutate();
  };

  const replies = repliesData?.replies || [];
  const replyCount = comment.replyCount || 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${isReply ? 'ml-12' : ''}`}>
      <div className="flex gap-3">
        {/* 頭像 */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {comment.author?.firstName?.[0] || 'U'}
        </div>

        <div className="flex-1 min-w-0">
          {/* 作者和時間 */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-gray-900">
                {comment.author?.firstName} {comment.author?.lastName}
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {new Date(comment.createdAt).toLocaleDateString('zh-TW')}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-gray-400 ml-2">(已編輯)</span>
              )}
            </div>

            {/* 選單 */}
            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Edit2 className="w-3 h-3" />
                      編輯
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                      刪除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 留言內容 */}
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={editMutation.isLoading || !editContent.trim()}
                  className="px-4 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 text-sm"
                >
                  儲存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="px-4 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* 互動按鈕 */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={handleLike}
                disabled={likeMutation.isLoading}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  liked 
                    ? 'text-red-600 hover:text-red-700' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                <Heart 
                  className="w-4 h-4" 
                  fill={liked ? 'currentColor' : 'none'}
                />
                <span>{likesCount}</span>
              </button>

              {!isReply && isAuthenticated && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <CornerDownRight className="w-4 h-4" />
                  回覆
                </button>
              )}

              {!isReply && replyCount > 0 && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  {showReplies ? '隱藏' : '查看'} {replyCount} 則回覆
                </button>
              )}
            </div>
          )}

          {/* 回覆表單 */}
          {showReplyForm && (
            <div className="mt-4">
              <CommentForm
                onSubmit={handleReplySubmit}
                isSubmitting={replyMutation.isLoading}
                placeholder="回覆這則留言..."
                autoFocus={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* 回覆列表 */}
      {showReplies && replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              postId={postId}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
