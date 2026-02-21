/**
 * Performance utilities for ultra-fast loading
 * Rocket-speed optimization for live mode
 */

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload fonts - but don't block
  const fontPreloads = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  ];
  
  fontPreloads.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  });
};

// Defer non-critical operations with polyfill
export const deferOperation = (fn: () => void, timeout = 2000) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(fn, { timeout });
  } else if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
    (window as any).scheduler.postTask(fn, { priority: 'background' });
  } else {
    setTimeout(fn, 16); // One frame delay
  }
};

// Batch DOM reads/writes for better performance
export const batchDOMOperation = (fn: () => void) => {
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  } else {
    fn();
  }
};

// Intersection Observer for lazy loading
export const createLazyLoadObserver = (
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
) => {
  if (!('IntersectionObserver' in window)) {
    return null;
  }
  
  return new IntersectionObserver((entries) => {
    entries.forEach(callback);
  }, {
    rootMargin: '100px', // Start loading earlier
    threshold: 0.01, // Trigger on smallest visibility
    ...options
  });
};

// Debounce for scroll/resize handlers
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Throttle for high-frequency events
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
};

// Check if device is low-end for reduced animations
export const isLowEndDevice = (): boolean => {
  // Check for reduced motion preference
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }
  
  // Check hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
    return true;
  }
  
  // Check device memory (if available)
  if ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 2) {
    return true;
  }
  
  return false;
};

// Preconnect to external domains for faster resource loading
export const preconnectToDomains = (domains: string[]) => {
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Cache with TTL for in-memory caching
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global profiles cache - 10 minute TTL
export const profilesCache = new TTLCache<{
  username: string;
  avatar_url: string | null;
  gender?: string;
  is_verified?: boolean;
}>();

// Preload images for faster display
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Preload multiple images in parallel (limit concurrency)
export const preloadImages = async (srcs: string[], limit = 4): Promise<void> => {
  const validSrcs = srcs.filter(Boolean);
  for (let i = 0; i < validSrcs.length; i += limit) {
    await Promise.all(validSrcs.slice(i, i + limit).map(preloadImage).map(p => p.catch(() => {})));
  }
};

// Force service worker update to fix stale cache issues
export const forceServiceWorkerUpdate = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        // Force immediate update check
        await registration.update();
        
        // If there's a waiting worker, skip waiting and activate
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (e) {
      console.warn('Service worker update failed:', e);
    }
  }
};

// Clear all caches for fresh start
export const clearAllCaches = async () => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    } catch (e) {
      console.warn('Cache clear failed:', e);
    }
  }
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Run immediately on import
  if (typeof window !== 'undefined') {
    // Preconnect to Supabase and other critical domains immediately
    preconnectToDomains([
      'https://vubvqjqhfnalqjocgvae.supabase.co',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ]);
    
    // Force service worker update on every load for faster updates
    forceServiceWorkerUpdate();
    
    // Initialize mobile performance monitoring
    import('./mobilePerformance').then(({ getDeviceProfile }) => {
      const profile = getDeviceProfile();
      if (profile.isLowEnd) {
        // Reduce animation complexity on low-end devices
        document.documentElement.classList.add('reduce-animations');
      }
    });
    
    // Initialize smart prefetch system after initial load
    deferOperation(async () => {
      const { initSmartPrefetch } = await import('./smartPrefetch');
      const { initNetworkMonitoring } = await import('./networkOptimizer');
      initSmartPrefetch();
      initNetworkMonitoring();
    }, 3000);
  }
};

// Memory-efficient LRU Cache for frequent data
export class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest entry (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global caches for performance
export const imageLoadedCache = new LRUCache<boolean>(500);
export const componentLoadedCache = new LRUCache<boolean>(50);

// Mark component as loaded for instant re-render
export const markComponentLoaded = (componentName: string) => {
  componentLoadedCache.set(componentName, true);
};

// Check if component was already loaded
export const isComponentLoaded = (componentName: string): boolean => {
  return componentLoadedCache.has(componentName);
};

// Measure performance
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${name}-start`);
    fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  } else {
    fn();
  }
};

// Report Web Vitals (for debugging)
export const reportWebVitals = () => {
  if ('PerformanceObserver' in window) {
    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      console.log('[Web Vitals] LCP:', lastEntry.startTime.toFixed(2), 'ms');
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // FID
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        console.log('[Web Vitals] FID:', entry.processingStart - entry.startTime, 'ms');
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    
    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      console.log('[Web Vitals] CLS:', clsValue.toFixed(4));
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
};

// Auto-run on import
initPerformanceOptimizations();