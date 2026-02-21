import { lazy, ComponentType } from 'react';

// Track refresh attempts to prevent infinite loops
const REFRESH_KEY = 'lazy_module_refresh_time';
const MIN_REFRESH_INTERVAL = 10000; // 10 seconds

function shouldAutoRefresh(): boolean {
  const lastRefresh = sessionStorage.getItem(REFRESH_KEY);
  if (!lastRefresh) return true;
  
  const elapsed = Date.now() - parseInt(lastRefresh, 10);
  return elapsed > MIN_REFRESH_INTERVAL;
}

function markRefresh(): void {
  sessionStorage.setItem(REFRESH_KEY, Date.now().toString());
}

// Helper to retry dynamic imports on network failures
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 2,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        
        const errorMessage = String(error);
        const isNetworkError = 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('dynamically imported module') ||
          errorMessage.includes('Loading chunk') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('load failed');
        
        // Don't retry non-network errors
        if (!isNetworkError) {
          throw error;
        }
        
        // Last attempt - try page refresh for stale module cache
        if (attempt === retries) {
          if (shouldAutoRefresh()) {
            markRefresh();
            window.location.reload();
            // Return a never-resolving promise to prevent further execution
            return new Promise(() => {});
          }
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
    
    throw lastError;
  });
}

// Version for named exports
export function lazyWithRetryNamed<T extends ComponentType<any>>(
  importFn: () => Promise<any>,
  exportName: string,
  retries = 2,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await importFn();
        return { default: module[exportName] as T };
      } catch (error) {
        lastError = error as Error;
        
        const errorMessage = String(error);
        const isNetworkError = 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('dynamically imported module') ||
          errorMessage.includes('Loading chunk') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('load failed');
        
        if (!isNetworkError) {
          throw error;
        }
        
        if (attempt === retries) {
          if (shouldAutoRefresh()) {
            markRefresh();
            window.location.reload();
            return new Promise(() => {});
          }
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
    
    throw lastError;
  });
}
