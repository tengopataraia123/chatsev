import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook that defers a value update to avoid blocking the main thread
 * Similar to React 18's useDeferredValue but with more control
 */
export const useDeferredValue = <T>(value: T, delay: number = 100): T => {
  const [deferredValue, setDeferredValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDeferredValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return deferredValue;
};

/**
 * Hook to defer initial data fetch to not block first paint
 */
export const useDeferredFetch = <T>(
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  deferMs: number = 500
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const doFetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      if (isMounted.current) {
        setData(result);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;

    // Defer the fetch
    const timeout = setTimeout(() => {
      if (isMounted.current) {
        doFetch();
      }
    }, deferMs);

    return () => {
      isMounted.current = false;
      clearTimeout(timeout);
    };
  }, deps);

  return { data, loading, error, refetch: doFetch };
};

/**
 * Hook for throttled state updates - useful for rapid changes
 */
export const useThrottledState = <T>(
  initialValue: T,
  throttleMs: number = 100
): [T, (value: T) => void, T] => {
  const [state, setState] = useState(initialValue);
  const [throttledState, setThrottledState] = useState(initialValue);
  const lastUpdate = useRef(0);
  const pendingUpdate = useRef<NodeJS.Timeout | null>(null);

  const setThrottled = (value: T) => {
    setState(value);
    
    const now = Date.now();
    if (now - lastUpdate.current >= throttleMs) {
      lastUpdate.current = now;
      setThrottledState(value);
    } else {
      if (pendingUpdate.current) {
        clearTimeout(pendingUpdate.current);
      }
      pendingUpdate.current = setTimeout(() => {
        lastUpdate.current = Date.now();
        setThrottledState(value);
      }, throttleMs);
    }
  };

  useEffect(() => {
    return () => {
      if (pendingUpdate.current) {
        clearTimeout(pendingUpdate.current);
      }
    };
  }, []);

  return [state, setThrottled, throttledState];
};
