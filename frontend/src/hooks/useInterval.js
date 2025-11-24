import { useEffect, useRef } from 'react';

const useInterval = (callback, delay) => {
  const savedCallback = useRef();

  // 記住最新的 callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // 設置 interval
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => {
        savedCallback.current();
      }, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

export default useInterval;
