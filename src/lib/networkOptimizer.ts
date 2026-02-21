/**
 * Network Optimizer
 * - Connection quality detection
 * - Adaptive loading strategies
 * - Request prioritization
 * - Offline handling
 */

export type ConnectionQuality = '4g' | '3g' | '2g' | 'slow-2g' | 'offline' | 'unknown';

interface NetworkInfo {
  quality: ConnectionQuality;
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
  isOnline: boolean;
}

// Get current network info
export const getNetworkInfo = (): NetworkInfo => {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  const isOnline = navigator.onLine;
  
  if (!isOnline) {
    return {
      quality: 'offline',
      downlink: 0,
      rtt: Infinity,
      saveData: false,
      isOnline: false
    };
  }
  
  if (!connection) {
    return {
      quality: 'unknown',
      downlink: 10, // Assume decent connection
      rtt: 100,
      saveData: false,
      isOnline: true
    };
  }
  
  return {
    quality: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 10,
    rtt: connection.rtt || 100,
    saveData: connection.saveData || false,
    isOnline: true
  };
};

// Check if connection is good enough for heavy operations
export const isGoodConnection = (): boolean => {
  const info = getNetworkInfo();
  if (!info.isOnline || info.saveData) return false;
  return info.quality === '4g' || (info.quality === '3g' && info.downlink >= 1.5);
};

// Check if should reduce data usage
export const shouldReduceData = (): boolean => {
  const info = getNetworkInfo();
  return !info.isOnline || info.saveData || info.quality === '2g' || info.quality === 'slow-2g';
};

// Get optimal image quality based on network
export const getOptimalImageQuality = (): 'high' | 'medium' | 'low' => {
  const info = getNetworkInfo();
  
  if (!info.isOnline) return 'low';
  if (info.saveData || info.quality === 'slow-2g') return 'low';
  if (info.quality === '2g' || info.quality === '3g') return 'medium';
  return 'high';
};

// Get optimal image size based on network and viewport
export const getOptimalImageSize = (viewportWidth: number): number => {
  const quality = getOptimalImageQuality();
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x
  
  const sizes = {
    high: Math.min(viewportWidth * devicePixelRatio, 1920),
    medium: Math.min(viewportWidth * devicePixelRatio, 1080),
    low: Math.min(viewportWidth, 640)
  };
  
  return sizes[quality];
};

// Network-aware fetch with retry and timeout
export const networkAwareFetch = async <T>(
  url: string,
  options: RequestInit = {},
  config: {
    timeout?: number;
    retries?: number;
    priority?: 'high' | 'low';
  } = {}
): Promise<T> => {
  const { timeout = 10000, retries = 2, priority = 'low' } = config;
  const info = getNetworkInfo();
  
  // Adjust timeout based on network
  const adjustedTimeout = info.quality === '2g' || info.quality === 'slow-2g'
    ? timeout * 2
    : timeout;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), adjustedTimeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // Add priority hint if supported
        ...(priority === 'high' ? { priority: 'high' } : {})
      } as RequestInit);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on abort or non-network errors
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // Wait before retry with exponential backoff
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Network request failed');
};

// Connection change listener
type ConnectionChangeCallback = (info: NetworkInfo) => void;
const listeners: Set<ConnectionChangeCallback> = new Set();

export const onConnectionChange = (callback: ConnectionChangeCallback): (() => void) => {
  listeners.add(callback);
  
  return () => {
    listeners.delete(callback);
  };
};

// Initialize network monitoring
export const initNetworkMonitoring = () => {
  const notifyListeners = () => {
    const info = getNetworkInfo();
    listeners.forEach(cb => cb(info));
  };
  
  // Listen for online/offline events
  window.addEventListener('online', notifyListeners);
  window.addEventListener('offline', notifyListeners);
  
  // Listen for connection changes if available
  const connection = (navigator as any).connection;
  if (connection) {
    connection.addEventListener('change', notifyListeners);
  }
  
  // Initial notification
  notifyListeners();
};

// Debounced scroll handler for performance
export const createScrollHandler = (
  callback: () => void,
  delay: number = 150
): (() => void) => {
  let ticking = false;
  let lastCall = 0;
  
  return () => {
    const now = Date.now();
    if (now - lastCall < delay) return;
    
    if (!ticking) {
      requestAnimationFrame(() => {
        callback();
        ticking = false;
        lastCall = Date.now();
      });
      ticking = true;
    }
  };
};

// Request queue for prioritization
interface QueuedRequest {
  id: string;
  priority: number;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

const requestQueue: QueuedRequest[] = [];
let isProcessing = false;
const MAX_CONCURRENT = 4;
let activeRequests = 0;

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;
  isProcessing = true;
  
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    // Sort by priority (higher = more important)
    requestQueue.sort((a, b) => b.priority - a.priority);
    
    const request = requestQueue.shift();
    if (!request) break;
    
    activeRequests++;
    
    request.execute()
      .then(request.resolve)
      .catch(request.reject)
      .finally(() => {
        activeRequests--;
        processQueue();
      });
  }
  
  isProcessing = false;
};

export const queueRequest = <T>(
  execute: () => Promise<T>,
  priority: number = 0
): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      id: Math.random().toString(36).substring(7),
      priority,
      execute,
      resolve,
      reject
    });
    processQueue();
  });
};

// Clear pending low-priority requests
export const clearLowPriorityRequests = (threshold: number = 5) => {
  const highPriority = requestQueue.filter(r => r.priority >= threshold);
  const cleared = requestQueue.length - highPriority.length;
  requestQueue.length = 0;
  requestQueue.push(...highPriority);
  
  if (cleared > 0) {
    console.log(`[NetworkOptimizer] Cleared ${cleared} low-priority requests`);
  }
};
