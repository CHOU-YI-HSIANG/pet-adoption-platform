import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../services/auth';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

const CommentSection = ({ postId }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;

  // 獲取留言列表
  const { data: commentsData, isLoading } = useQuery(
    ['comments', postId, page],
    async () => {
      const response = await fetch(
        `http://localhost:5000/api/comments/post/${postId}?page=${page}&limit=${limit}`
      );
      if (!response.ok) throw new Error('載入失敗');
      return response.json();
    },
    {
      select: (response) => response.data,
      keepPreviousData: true
    }
  );

  // 發布新留言
  const createCommentMutation = useMutation(
    async (content) => {
      const response = await fetch('http://localhost:5000/api/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, post: postId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '發布失敗');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('留言發布成功');
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['post', postId]);
      },
      onError: (error) => {
        toast.error(error.message || '發布失敗，請稍後再試');
      }
    }
  );

  const handleSubmit = (content) => {
    createCommentMutation.mutate(content);
  };

  const comments = commentsData?.comments || [];
  const pagination = commentsData?.pagination || {};

  return (
    <div className="mt-8">
      {/* 留言標題 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-900">
            留言 ({pagination.total || 0})
          </h2>
        </div>

        {/* 留言輸入框 */}
        {isAuthenticated ? (
          <CommentForm
            onSubmit={handleSubmit}
            isSubmitting={createCommentMutation.isLoading}
            placeholder="分享您的想法..."
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>請先登入才能發表留言</p>
          </div>
        )}
      </div>

      {/* 留言列表 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              postId={postId}
            />
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">目前還沒有留言，成為第一個留言的人吧！</p>
          </div>
        )}
      </div>

      {/* 分頁 */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一頁
          </button>
          <span className="px-4 py-2 text-gray-600">
            第 {page} / {pagination.pages} 頁
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
