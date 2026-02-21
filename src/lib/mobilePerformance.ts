/**
 * Mobile Performance Manager (2026)
 * Centralized optimization for battery, CPU, GPU, and network
 * on mobile devices. Reduces heat, lag, and data usage.
 */

// ─── Device Capability Detection ───
export interface DeviceProfile {
  isLowEnd: boolean;
  cpuCores: number;
  memoryGB: number;
  isLowPower: boolean;
  prefersReducedMotion: boolean;
  isMobile: boolean;
  gpuTier: 'low' | 'mid' | 'high';
}

let cachedProfile: DeviceProfile | null = null;

export const getDeviceProfile = (): DeviceProfile => {
  if (cachedProfile) return cachedProfile;

  const nav = navigator as any;
  const cores = nav.hardwareConcurrency || 4;
  const memGB = nav.deviceMemory || 4;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isLowEnd = cores <= 4 || memGB <= 2 || prefersReduced;
  const isLowPower = sessionStorage.getItem('device_low_power') === 'true';

  let gpuTier: 'low' | 'mid' | 'high' = 'mid';
  if (isLowEnd || memGB <= 2) gpuTier = 'low';
  else if (cores >= 8 && memGB >= 6) gpuTier = 'high';

  cachedProfile = { isLowEnd, cpuCores: cores, memoryGB: memGB, isLowPower, prefersReducedMotion: prefersReduced, isMobile, gpuTier };
  return cachedProfile;
};

// ─── Visibility & Background Management ───
type VisibilityCallback = (isVisible: boolean) => void;
const visibilityListeners = new Set<VisibilityCallback>();
let isPageVisible = !document.hidden;

export const onVisibilityChange = (cb: VisibilityCallback): (() => void) => {
  visibilityListeners.add(cb);
  return () => visibilityListeners.delete(cb);
};

export const getPageVisibility = () => isPageVisible;

const handleVisibility = () => {
  isPageVisible = !document.hidden;
  visibilityListeners.forEach(cb => cb(isPageVisible));
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibility);
}

// ─── Adaptive Intervals ───
// Returns an interval that pauses when page is hidden and adapts to device capability
export const createAdaptiveInterval = (
  callback: () => void,
  baseMs: number,
  options?: { pauseWhenHidden?: boolean; slowDownFactor?: number }
): (() => void) => {
  const { pauseWhenHidden = true, slowDownFactor = 1.5 } = options || {};
  const profile = getDeviceProfile();
  
  // Slow down on low-end devices
  const adjustedMs = profile.isLowEnd ? baseMs * slowDownFactor : baseMs;
  
  let intervalId: ReturnType<typeof setInterval> | null = null;
  
  const start = () => {
    if (intervalId) return;
    intervalId = setInterval(callback, adjustedMs);
  };
  
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  
  start();
  
  let unsubVisibility: (() => void) | null = null;
  if (pauseWhenHidden) {
    unsubVisibility = onVisibilityChange((visible) => {
      if (visible) start();
      else stop();
    });
  }
  
  return () => {
    stop();
    unsubVisibility?.();
  };
};

// ─── Animation Budget ───
// Limits concurrent animations on low-end devices
let activeAnimations = 0;
const MAX_ANIMATIONS_LOW = 3;
const MAX_ANIMATIONS_MID = 8;
const MAX_ANIMATIONS_HIGH = 20;

export const canAnimate = (): boolean => {
  const profile = getDeviceProfile();
  if (profile.prefersReducedMotion) return false;
  
  const max = profile.gpuTier === 'low' ? MAX_ANIMATIONS_LOW 
    : profile.gpuTier === 'mid' ? MAX_ANIMATIONS_MID 
    : MAX_ANIMATIONS_HIGH;
  
  return activeAnimations < max;
};

export const registerAnimation = (): (() => void) => {
  activeAnimations++;
  return () => { activeAnimations = Math.max(0, activeAnimations - 1); };
};

// ─── Media Loading Policies ───
export const getMediaPolicy = () => {
  const profile = getDeviceProfile();
  const connection = (navigator as any).connection;
  const saveData = connection?.saveData || false;
  const effectiveType = connection?.effectiveType || '4g';
  const isSlowNetwork = saveData || effectiveType === '2g' || effectiveType === 'slow-2g';
  
  return {
    // Video
    videoAutoplay: false, // NEVER autoplay on mobile
    videoPreload: isSlowNetwork ? 'none' : 'metadata' as 'none' | 'metadata',
    maxVideoResolution: isSlowNetwork ? 480 : (profile.isLowEnd ? 480 : 720),
    
    // Images
    maxImageWidth: isSlowNetwork ? 640 : (profile.isLowEnd ? 640 : 1080),
    imageQuality: isSlowNetwork ? 0.6 : (profile.isLowEnd ? 0.7 : 0.85),
    lazyLoadMargin: profile.isLowEnd ? '200px' : '300px',
    
    // Animations
    enableBlur: !profile.isLowEnd && !isSlowNetwork,
    enableShadows: !profile.isLowEnd,
    enableTransitions: !profile.prefersReducedMotion,
    
    // Data
    paginationLimit: isSlowNetwork ? 10 : 20,
    maxConcurrentRequests: isSlowNetwork ? 2 : 4,
    
    // Audio
    audioAutoplay: false,
  };
};

// ─── GPU-Friendly CSS Helper ───
// Returns optimized CSS classes based on device capability
export const getOptimizedClasses = (intent: 'blur-header' | 'shadow-card' | 'animate-entrance') => {
  const profile = getDeviceProfile();
  
  switch (intent) {
    case 'blur-header':
      return profile.isLowEnd 
        ? 'bg-background/98' // No blur on low-end
        : 'bg-background/95 backdrop-blur-sm'; // Light blur
    case 'shadow-card':
      return profile.isLowEnd 
        ? 'border border-border' 
        : 'shadow-sm border border-border/50';
    case 'animate-entrance':
      return profile.prefersReducedMotion ? '' : 'animate-in fade-in duration-200';
    default:
      return '';
  }
};

// ─── Request Throttle for Background ───
// Prevents API spam when app is backgrounded
let backgroundThrottleActive = false;
const pendingBackgroundRequests: Array<() => void> = [];

onVisibilityChange((visible) => {
  backgroundThrottleActive = !visible;
  if (visible && pendingBackgroundRequests.length > 0) {
    // Process queued requests when returning to foreground
    const batch = pendingBackgroundRequests.splice(0, 5);
    batch.forEach(fn => fn());
  }
});

export const throttledRequest = <T>(fn: () => Promise<T>): Promise<T> => {
  if (!backgroundThrottleActive) return fn();
  
  // Queue if backgrounded
  return new Promise((resolve) => {
    pendingBackgroundRequests.push(() => {
      fn().then(resolve);
    });
  });
};

// ─── Memory Pressure Detection ───
let memoryPressureLevel: 'none' | 'moderate' | 'critical' = 'none';

export const getMemoryPressure = () => memoryPressureLevel;

if (typeof performance !== 'undefined' && 'memory' in performance) {
  const checkMemory = () => {
    const mem = (performance as any).memory;
    if (mem) {
      const usedRatio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
      if (usedRatio > 0.9) memoryPressureLevel = 'critical';
      else if (usedRatio > 0.7) memoryPressureLevel = 'moderate';
      else memoryPressureLevel = 'none';
    }
  };
  // Use adaptive interval that pauses when hidden
  createAdaptiveInterval(checkMemory, 30000, { pauseWhenHidden: true });
}

// ─── Cleanup Registry ───
// Central place to register cleanup functions for proper resource management
const cleanupFunctions = new Set<() => void>();

export const registerCleanup = (fn: () => void): (() => void) => {
  cleanupFunctions.add(fn);
  return () => cleanupFunctions.delete(fn);
};

export const runAllCleanups = () => {
  cleanupFunctions.forEach(fn => fn());
  cleanupFunctions.clear();
};

// Cleanup when page is being unloaded
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', runAllCleanups);
}
