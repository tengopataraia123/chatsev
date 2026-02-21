/**
 * Smart Prefetch Manager
 * - Behavior-based prefetching with network/battery awareness
 * - User history tracking for personalized prefetch
 * - Respects device capabilities and connection quality
 */

// User behavior tracking
const USER_BEHAVIOR_KEY = 'user_navigation_history';
const BEHAVIOR_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface NavigationEntry {
  route: string;
  timestamp: number;
  count: number;
}

interface UserBehavior {
  entries: NavigationEntry[];
  lastUpdated: number;
}

// Get connection quality
export const getConnectionQuality = (): 'fast' | 'slow' | 'unknown' => {
  const connection = (navigator as any).connection;
  if (!connection) return 'unknown';
  
  const effectiveType = connection.effectiveType;
  const saveData = connection.saveData;
  
  if (saveData) return 'slow';
  if (effectiveType === '4g' || effectiveType === 'wifi') return 'fast';
  if (effectiveType === '3g') return 'slow';
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'slow';
  
  return 'unknown';
};

// Check if device is in low power/battery saver mode
export const isLowPowerMode = (): boolean => {
  // Check battery API if available
  if ('getBattery' in navigator) {
    // Can't await here, but we can use cached value
    const cached = sessionStorage.getItem('device_low_power');
    if (cached) return cached === 'true';
  }
  return false;
};

// Initialize battery monitoring
export const initBatteryMonitoring = async () => {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      const updateBatteryStatus = () => {
        const isLow = battery.level < 0.2 || battery.charging === false && battery.level < 0.3;
        sessionStorage.setItem('device_low_power', String(isLow));
      };
      updateBatteryStatus();
      battery.addEventListener('levelchange', updateBatteryStatus);
      battery.addEventListener('chargingchange', updateBatteryStatus);
    } catch {
      // Silently fail
    }
  }
};

// Track user navigation
export const trackNavigation = (route: string) => {
  try {
    const stored = localStorage.getItem(USER_BEHAVIOR_KEY);
    let behavior: UserBehavior = stored 
      ? JSON.parse(stored) 
      : { entries: [], lastUpdated: Date.now() };
    
    // Clean old entries
    const now = Date.now();
    behavior.entries = behavior.entries.filter(e => now - e.timestamp < BEHAVIOR_TTL);
    
    // Update or add entry
    const existing = behavior.entries.find(e => e.route === route);
    if (existing) {
      existing.count++;
      existing.timestamp = now;
    } else {
      behavior.entries.push({ route, timestamp: now, count: 1 });
    }
    
    // Keep only top 20 routes
    behavior.entries.sort((a, b) => b.count - a.count);
    behavior.entries = behavior.entries.slice(0, 20);
    behavior.lastUpdated = now;
    
    localStorage.setItem(USER_BEHAVIOR_KEY, JSON.stringify(behavior));
  } catch {
    // Silently fail - localStorage might be full
  }
};

// Get frequently visited routes
export const getFrequentRoutes = (minVisits = 2): string[] => {
  try {
    const stored = localStorage.getItem(USER_BEHAVIOR_KEY);
    if (!stored) return [];
    
    const behavior: UserBehavior = JSON.parse(stored);
    const now = Date.now();
    
    // Only consider recent entries
    return behavior.entries
      .filter(e => e.count >= minVisits && now - e.timestamp < BEHAVIOR_TTL)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(e => e.route);
  } catch {
    return [];
  }
};

// Route chunk mapping for lazy imports
const ROUTE_CHUNKS: Record<string, () => Promise<any>> = {
  'chat': () => import('@/components/messenger/MessengerPage'),
  'group-chat': () => import('@/components/groupchat/RoomSelector'),
  'forums': () => import('@/components/features/ForumsView'),
  'admin': () => import('@/components/admin/AdminPanel'),
  'settings': () => import('@/components/settings/SettingsView'),
  // dating module removed
  'groups': () => import('@/components/groups/GroupsView'),
  // reels removed
  'videos': () => import('@/components/videos/VideosView'),
  'music': () => import('@/components/features/MusicView'),
  'polls': () => import('@/components/features/PollsView'),
  'blogs': () => import('@/components/features/BlogsView'),
  'online-users': () => import('@/components/features/OnlineUsersView'),
  'profile': () => import('@/components/profile/ProfileView'),
};

// Prefetch queue to avoid overwhelming the browser
let prefetchQueue: string[] = [];
let isPrefetching = false;

const processPrefetchQueue = async () => {
  if (isPrefetching || prefetchQueue.length === 0) return;
  isPrefetching = true;
  
  while (prefetchQueue.length > 0) {
    const route = prefetchQueue.shift()!;
    const chunkLoader = ROUTE_CHUNKS[route];
    
    if (chunkLoader) {
      try {
        await chunkLoader();
        console.log(`[Prefetch] Loaded: ${route}`);
      } catch (e) {
        console.warn(`[Prefetch] Failed to load: ${route}`, e);
      }
    }
    
    // Small delay between prefetches to not block main thread
    await new Promise(r => setTimeout(r, 100));
  }
  
  isPrefetching = false;
};

// Smart prefetch with all conditions checked
export const smartPrefetch = (routes: string[]) => {
  // Don't prefetch on slow connections
  if (getConnectionQuality() === 'slow') {
    console.log('[Prefetch] Skipped - slow connection');
    return;
  }
  
  // Don't prefetch on low power mode
  if (isLowPowerMode()) {
    console.log('[Prefetch] Skipped - low power mode');
    return;
  }
  
  // Add to queue (deduplicate)
  routes.forEach(route => {
    if (!prefetchQueue.includes(route) && ROUTE_CHUNKS[route]) {
      prefetchQueue.push(route);
    }
  });
  
  // Process queue during idle time
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => processPrefetchQueue(), { timeout: 5000 });
  } else {
    setTimeout(processPrefetchQueue, 2000);
  }
};

// Prefetch based on user behavior (called during idle)
export const prefetchFrequentRoutes = () => {
  const frequentRoutes = getFrequentRoutes(3); // Routes visited 3+ times
  if (frequentRoutes.length > 0) {
    console.log('[Prefetch] User frequent routes:', frequentRoutes);
    smartPrefetch(frequentRoutes);
  }
};

// Prefetch on hover (desktop) with debounce
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
export const prefetchOnHover = (route: string) => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
  
  hoverTimeout = setTimeout(() => {
    smartPrefetch([route]);
  }, 150); // 150ms hover delay to avoid accidental triggers
};

// Cancel hover prefetch
export const cancelHoverPrefetch = () => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
};

// Initialize smart prefetch system
export const initSmartPrefetch = () => {
  // Initialize battery monitoring
  initBatteryMonitoring();
  
  // Prefetch frequent routes during idle time (after 5 seconds)
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetchFrequentRoutes, { timeout: 10000 });
    } else {
      setTimeout(prefetchFrequentRoutes, 3000);
    }
  }, 5000);
};
