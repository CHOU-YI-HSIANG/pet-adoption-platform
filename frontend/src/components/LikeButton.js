import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../services/auth';

const LikeButton = ({ postId, initialLiked = false, initialCount = 0, showCount = true }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  // 當 initialLiked 或 initialCount prop 變更時，同步更新本地狀態
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const likeMutation = useMutation(
    async () => {
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
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
        // 保存當前狀態用於回滾
        const previousLiked = liked;
        const previousCount = count;
        
        // Optimistic update
        setLiked(!liked);
        setCount(liked ? count - 1 : count + 1);
        
        return { previousLiked, previousCount };
      },
      onSuccess: (data) => {
        // 更新從 server 返回的真實數據
        if (data.data) {
          setLiked(data.data.liked);
          setCount(data.data.likesCount);
        }
        
        // 使相關查詢失效
        queryClient.invalidateQueries(['posts']);
        queryClient.invalidateQueries(['post', postId]);
      },
      onError: (error, variables, context) => {
        // 回滾到原本的狀態
        if (context?.previousLiked !== undefined) {
          setLiked(context.previousLiked);
        }
        if (context?.previousCount !== undefined) {
          setCount(context.previousCount);
        }
        toast.error(error.message || '操作失敗，請稍後再試');
      }
    }
  );

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('請先登入才能按讚');
      return;
    }

    likeMutation.mutate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={likeMutation.isLoading}
      className={`flex items-center gap-1 transition-colors ${
        liked 
          ? 'text-red-600 hover:text-red-700' 
          : 'text-gray-600 hover:text-red-600'
      } ${likeMutation.isLoading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <Heart 
        className={`w-5 h-5 transition-all ${liked ? 'fill-current' : ''}`}
      />
      {showCount && <span className="text-sm font-medium">{count}</span>}
    </button>
  );
};

export default LikeButton;
