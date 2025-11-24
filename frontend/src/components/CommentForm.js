import React, { useState } from 'react';
import { Send } from 'lucide-react';

const CommentForm = ({ onSubmit, isSubmitting, placeholder = "留下您的留言...", autoFocus = false }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      return;
    }

    onSubmit(content.trim());
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isSubmitting}
        rows={3}
        maxLength={1000}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {content.length} / 1000
        </span>
        
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? '發布中...' : '發布'}
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
