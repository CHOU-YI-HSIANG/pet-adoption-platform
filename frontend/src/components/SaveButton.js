import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../services/auth';

const SaveButton = ({ postId, initialSaved = false }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(initialSaved);

  const saveMutation = useMutation(
    async () => {
      const response = await fetch(`http://localhost:5000/api/users/saved-posts/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('操作失敗');
      }

      return response.json();
    },
    {
      onMutate: async () => {
        // Optimistic update
        setSaved(!saved);
      },
      onSuccess: (data) => {
        // 更新從 server 返回的真實數據
        if (data.data) {
          setSaved(data.data.saved);
        }
        
        toast.success(data.message || (saved ? '已取消收藏' : '已收藏貼文'));
        
        // 使相關查詢失效
        queryClient.invalidateQueries(['savedPosts']);
        queryClient.invalidateQueries(['posts']);
      },
      onError: (error) => {
        // 回滾
        setSaved(saved);
        toast.error(error.message || '操作失敗，請稍後再試');
      }
    }
  );

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('請先登入才能收藏');
      return;
    }

    saveMutation.mutate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={saveMutation.isLoading}
      className={`flex items-center gap-1 transition-colors ${
        saved 
          ? 'text-yellow-600 hover:text-yellow-700' 
          : 'text-gray-600 hover:text-yellow-600'
      } ${saveMutation.isLoading ? 'opacity-50 cursor-wait' : ''}`}
      title={saved ? '取消收藏' : '收藏貼文'}
    >
      <Bookmark 
        className={`w-5 h-5 transition-all ${saved ? 'fill-current' : ''}`}
      />
    </button>
  );
};

export default SaveButton;
