/**
 * Network-aware hooks for adaptive loading
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getNetworkInfo, 
  isGoodConnection, 
  shouldReduceData,
  onConnectionChange,
  type ConnectionQuality 
} from '@/lib/networkOptimizer';

interface NetworkState {
  quality: ConnectionQuality;
  isOnline: boolean;
  isFast: boolean;
  shouldReduceData: boolean;
  downlink: number;
}

/**
 * Hook to track network state changes
 */
export const useNetworkState = (): NetworkState => {
  const [state, setState] = useState<NetworkState>(() => {
    const info = getNetworkInfo();
    return {
      quality: info.quality,
      isOnline: info.isOnline,
      isFast: isGoodConnection(),
      shouldReduceData: shouldReduceData(),
      downlink: info.downlink
    };
  });

  useEffect(() => {
    const unsubscribe = onConnectionChange((info) => {
      setState({
        quality: info.quality,
        isOnline: info.isOnline,
        isFast: isGoodConnection(),
        shouldReduceData: shouldReduceData(),
        downlink: info.downlink
      });
    });

    return unsubscribe;
  }, []);

  return state;
};

/**
 * Hook for network-aware image loading
 */
export const useAdaptiveImageQuality = () => {
  const { quality, shouldReduceData: reduceData } = useNetworkState();

  const imageQuality = useMemo(() => {
    if (reduceData) return 'low';
    if (quality === '4g') return 'high';
    if (quality === '3g') return 'medium';
    return 'low';
  }, [quality, reduceData]);

  const maxImageWidth = useMemo(() => {
    switch (imageQuality) {
      case 'high': return 1920;
      case 'medium': return 1080;
      case 'low': return 640;
      default: return 1080;
    }
  }, [imageQuality]);

  return { imageQuality, maxImageWidth };
};

/**
 * Hook for network-aware video quality
 */
export const useAdaptiveVideoQuality = () => {
  const { quality, isFast } = useNetworkState();

  return useMemo(() => {
    if (!isFast) return '360p';
    if (quality === '4g') return '1080p';
    if (quality === '3g') return '720p';
    return '480p';
  }, [quality, isFast]);
};

/**
 * Hook for conditional features based on network
 */
export const useNetworkFeatures = () => {
  const { isFast, shouldReduceData: reduceData, isOnline } = useNetworkState();

  return useMemo(() => ({
    // Enable animations only on good connections
    enableAnimations: isFast && !reduceData,
    
    // Enable autoplay only on fast connections
    enableAutoplay: isFast && !reduceData,
    
    // Enable prefetching only on fast connections
    enablePrefetch: isFast && !reduceData,
    
    // Enable high-quality images only on fast connections
    enableHDImages: isFast && !reduceData,
    
    // Show offline indicator
    showOfflineIndicator: !isOnline,
    
    // Enable background sync only when online
    enableBackgroundSync: isOnline,
    
    // Reduce motion for slow connections
    reduceMotion: reduceData || !isFast
  }), [isFast, reduceData, isOnline]);
};

/**
 * Hook for debounced network-aware operations
 */
export const useNetworkDebounce = (
  callback: () => void,
  dependencies: any[],
  options: { immediate?: boolean } = {}
) => {
  const { isFast } = useNetworkState();
  
  // Longer debounce on slow connections
  const delay = isFast ? 300 : 600;

  useEffect(() => {
    if (options.immediate) {
      callback();
      return;
    }

    const timeoutId = setTimeout(callback, delay);
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...dependencies]);
};

/**
 * Hook for retry logic with network awareness
 */
export const useNetworkRetry = <T>(
  asyncFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    onError?: (error: Error, attempt: number) => void;
    onSuccess?: (data: T) => void;
  } = {}
) => {
  const { maxRetries = 3, initialDelay = 1000, onError, onSuccess } = options;
  const { isOnline, isFast } = useNetworkState();
  
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async () => {
    if (!isOnline) {
      setError(new Error('No internet connection'));
      return;
    }

    setLoading(true);
    setError(null);

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFn();
        setData(result);
        setRetryCount(attempt);
        onSuccess?.(result);
        setLoading(false);
        return;
      } catch (err) {
        lastError = err as Error;
        setRetryCount(attempt);
        onError?.(lastError, attempt);

        if (attempt < maxRetries) {
          // Exponential backoff with network awareness
          const backoffMultiplier = isFast ? 1 : 2;
          const delay = initialDelay * Math.pow(2, attempt) * backoffMultiplier;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    setError(lastError);
    setLoading(false);
  }, [asyncFn, isOnline, isFast, maxRetries, initialDelay, onError, onSuccess]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setRetryCount(0);
  }, []);

  return { data, error, loading, retryCount, execute, reset };
};

/**
 * Hook for offline queue
 */
export const useOfflineQueue = <T extends { id: string }>(
  processItem: (item: T) => Promise<void>
) => {
  const { isOnline } = useNetworkState();
  const [queue, setQueue] = useState<T[]>([]);
  const [processing, setProcessing] = useState(false);

  // Add item to queue
  const enqueue = useCallback((item: T) => {
    setQueue(prev => [...prev, item]);
    
    // Try to persist to localStorage
    try {
      const stored = localStorage.getItem('offline_queue') || '[]';
      const existing = JSON.parse(stored);
      localStorage.setItem('offline_queue', JSON.stringify([...existing, item]));
    } catch {
      // Silently fail
    }
  }, []);

  // Process queue when online
  useEffect(() => {
    if (!isOnline || processing || queue.length === 0) return;

    const processQueue = async () => {
      setProcessing(true);
      
      const remaining: T[] = [];
      
      for (const item of queue) {
        try {
          await processItem(item);
        } catch {
          remaining.push(item);
        }
      }
      
      setQueue(remaining);
      
      // Update localStorage
      try {
        localStorage.setItem('offline_queue', JSON.stringify(remaining));
      } catch {
        // Silently fail
      }
      
      setProcessing(false);
    };

    processQueue();
  }, [isOnline, processing, queue, processItem]);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch {
      // Silently fail
    }
  }, []);

  return { queue, enqueue, processing, queueLength: queue.length };
};
