import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * 延遲更新值，用於減少 API 請求頻率
 * 
 * @param {any} value - 要延遲的值
 * @param {number} delay - 延遲時間（毫秒）
 * @returns {any} 延遲後的值
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // 只在 debouncedSearchTerm 變化時才發送 API 請求
 *   fetchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // 設定延遲更新
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函數：如果 value 在延遲期間再次變化，取消前一個 timeout
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
