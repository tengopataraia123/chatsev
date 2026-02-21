/**
 * useIdleCallback - Runs expensive work only during browser idle periods.
 * Prevents jank by deferring non-critical computations.
 */
import { useEffect, useRef } from 'react';

export const useIdleCallback = (
  callback: () => void,
  deps: any[] = [],
  timeout = 2000
) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(
        () => savedCallback.current(),
        { timeout }
      );
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => savedCallback.current(), 50);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default useIdleCallback;
