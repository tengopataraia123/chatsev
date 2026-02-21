import { useCallback, useRef } from 'react';

/**
 * Hook for optimizing Interaction to Next Paint (INP)
 * Provides utilities to ensure smooth interactions
 */

/**
 * Wraps click handlers to avoid blocking the main thread
 * Uses requestIdleCallback or setTimeout for non-critical work
 */
export function useNonBlockingClick<T extends (...args: any[]) => any>(
  handler: T,
  options?: { priority?: 'high' | 'low' }
): (...args: Parameters<T>) => void {
  return useCallback((...args: Parameters<T>) => {
    if (options?.priority === 'high') {
      // High priority - use microtask for faster execution
      queueMicrotask(() => handler(...args));
    } else {
      // Low priority - defer to idle time
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => handler(...args), { timeout: 100 });
      } else {
        setTimeout(() => handler(...args), 0);
      }
    }
  }, [handler, options?.priority]);
}

/**
 * Debounce for input handlers to reduce INP
 */
export function useDebouncedInput<T extends (...args: any[]) => any>(
  handler: T,
  delay: number = 150
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => handler(...args), delay);
  }, [handler, delay]);
}

/**
 * Throttle for scroll/resize handlers
 */
export function useThrottledHandler<T extends (...args: any[]) => any>(
  handler: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false);
  const lastArgs = useRef<Parameters<T> | null>(null);

  return useCallback((...args: Parameters<T>) => {
    lastArgs.current = args;
    
    if (!inThrottle.current) {
      handler(...args);
      inThrottle.current = true;
      
      setTimeout(() => {
        inThrottle.current = false;
        // Execute with last args if there were calls during throttle
        if (lastArgs.current) {
          handler(...lastArgs.current);
        }
      }, limit);
    }
  }, [handler, limit]);
}

/**
 * Start a view transition if supported (smooth UI updates)
 */
export function startViewTransition(callback: () => void): void {
  if ('startViewTransition' in document) {
    (document as any).startViewTransition(callback);
  } else {
    callback();
  }
}

/**
 * Yield to main thread to prevent long tasks
 */
export async function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if ('scheduler' in window && 'yield' in (window as any).scheduler) {
      (window as any).scheduler.yield().then(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Break up long tasks into smaller chunks
 */
export async function processInChunks<T>(
  items: T[],
  processor: (item: T, index: number) => void,
  chunkSize: number = 5
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    chunk.forEach((item, idx) => processor(item, i + idx));
    
    // Yield after each chunk
    if (i + chunkSize < items.length) {
      await yieldToMain();
    }
  }
}
