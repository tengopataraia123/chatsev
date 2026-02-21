import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Network quality detection and adaptive loading
 */
export const useNetworkQuality = () => {
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    // Check Network Information API if available
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    const updateNetworkQuality = () => {
      if (connection) {
        // Slow if effective type is 2g or slow-2g, or if downlink < 1.5 Mbps
        const isSlow = connection.effectiveType === '2g' || 
                       connection.effectiveType === 'slow-2g' ||
                       (connection.downlink && connection.downlink < 1.5) ||
                       connection.saveData === true;
        setIsSlowNetwork(isSlow);
      }
    };
    
    updateNetworkQuality();
    
    if (connection) {
      connection.addEventListener('change', updateNetworkQuality);
    }
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkQuality);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isSlowNetwork, isOffline };
};

/**
 * Memory cache for API responses
 */
const memoryCache = new Map<string, { data: any; timestamp: number; }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCached = <T>(key: string): T | null => {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
};

export const setCache = <T>(key: string, data: T): void => {
  memoryCache.set(key, { data, timestamp: Date.now() });
  
  // Clean old entries periodically
  if (memoryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (now - v.timestamp > CACHE_DURATION) {
        memoryCache.delete(k);
      }
    }
  }
};

export const clearCache = (keyPattern?: string): void => {
  if (keyPattern) {
    for (const key of memoryCache.keys()) {
      if (key.includes(keyPattern)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.clear();
  }
};

/**
 * Request deduplication - prevent duplicate concurrent requests
 */
const pendingRequests = new Map<string, Promise<any>>();

export const dedupeRequest = async <T>(
  key: string, 
  requestFn: () => Promise<T>
): Promise<T> => {
  // If same request is in flight, return that promise
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }
  
  // Start new request
  const promise = requestFn()
    .finally(() => {
      pendingRequests.delete(key);
    });
  
  pendingRequests.set(key, promise);
  return promise;
};

/**
 * Optimistic update helper
 */
export const useOptimisticUpdate = <T>(initialData: T) => {
  const [data, setData] = useState<T>(initialData);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const rollbackRef = useRef<T | null>(null);
  
  const optimisticUpdate = useCallback((newData: T) => {
    rollbackRef.current = data;
    setData(newData);
    setIsOptimistic(true);
  }, [data]);
  
  const confirmUpdate = useCallback(() => {
    rollbackRef.current = null;
    setIsOptimistic(false);
  }, []);
  
  const rollback = useCallback(() => {
    if (rollbackRef.current !== null) {
      setData(rollbackRef.current);
      rollbackRef.current = null;
    }
    setIsOptimistic(false);
  }, []);
  
  const setConfirmedData = useCallback((newData: T) => {
    setData(newData);
    rollbackRef.current = null;
    setIsOptimistic(false);
  }, []);
  
  return { 
    data, 
    isOptimistic, 
    optimisticUpdate, 
    confirmUpdate, 
    rollback,
    setConfirmedData
  };
};

/**
 * Retry with exponential backoff for failed requests
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Preload critical data on idle
 */
export const preloadOnIdle = (preloadFn: () => void) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadFn, { timeout: 5000 });
  } else {
    setTimeout(preloadFn, 2000);
  }
};

/**
 * Image preloader for faster image display
 */
export const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
};

/**
 * Stale-while-revalidate pattern
 */
export const useStaleWhileRevalidate = <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  deps: any[] = []
) => {
  const [data, setData] = useState<T | null>(() => getCached<T>(cacheKey));
  const [loading, setLoading] = useState(!getCached(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  
  useEffect(() => {
    const load = async () => {
      // Show cached data immediately if available
      const cached = getCached<T>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
      }
      
      try {
        const freshData = await dedupeRequest(cacheKey, fetchFn);
        if (isMounted.current) {
          setCache(cacheKey, freshData);
          setData(freshData);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };
    
    load();
  }, [cacheKey, ...deps]);
  
  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const freshData = await fetchFn();
      if (isMounted.current) {
        setCache(cacheKey, freshData);
        setData(freshData);
        setError(null);
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
  }, [cacheKey, fetchFn]);
  
  return { data, loading, error, refetch };
};
