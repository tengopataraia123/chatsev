/**
 * useRoutePrefetch Hook
 * - Tracks user navigation patterns
 * - Prefetches likely next routes on hover
 * - Network-aware prefetching
 */

import { useCallback, useEffect, useRef } from 'react';
import { trackNavigation, prefetchOnHover, cancelHoverPrefetch, smartPrefetch, getFrequentRoutes } from '@/lib/smartPrefetch';
import { isGoodConnection } from '@/lib/networkOptimizer';

/**
 * Hook to track navigation and enable smart prefetching
 */
export const useRoutePrefetch = (currentRoute: string) => {
  const previousRoute = useRef<string | null>(null);

  // Track navigation changes
  useEffect(() => {
    if (currentRoute && currentRoute !== previousRoute.current) {
      trackNavigation(currentRoute);
      previousRoute.current = currentRoute;
    }
  }, [currentRoute]);

  // Create hover handlers for nav items
  const createHoverHandlers = useCallback((targetRoute: string) => ({
    onMouseEnter: () => {
      if (isGoodConnection()) {
        prefetchOnHover(targetRoute);
      }
    },
    onMouseLeave: cancelHoverPrefetch,
    onTouchStart: () => {
      if (isGoodConnection()) {
        prefetchOnHover(targetRoute);
      }
    }
  }), []);

  // Manual prefetch trigger
  const prefetch = useCallback((routes: string[]) => {
    smartPrefetch(routes);
  }, []);

  // Get user's frequent routes
  const getFrequent = useCallback((minVisits: number = 2) => {
    return getFrequentRoutes(minVisits);
  }, []);

  return {
    createHoverHandlers,
    prefetch,
    getFrequent
  };
};

/**
 * Hook for prefetching adjacent routes based on current location
 */
export const useAdjacentPrefetch = (currentRoute: string) => {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (hasPreloaded.current || !isGoodConnection()) return;
    hasPreloaded.current = true;

    // Define route adjacency map (what routes are likely next from current)
    const adjacencyMap: Record<string, string[]> = {
      'home': ['chat', 'profile', 'reels'],
      'chat': ['home', 'profile'],
      'profile': ['settings', 'photos', 'chat'],
      'reels': ['home', 'profile'],
      'group-chat': ['home', 'profile'],
      'forums': ['home', 'profile'],
      'groups': ['home', 'chat'],
    };

    const adjacentRoutes = adjacencyMap[currentRoute] || [];
    
    if (adjacentRoutes.length > 0) {
      // Delay prefetch to not interfere with current route loading
      const timeoutId = setTimeout(() => {
        smartPrefetch(adjacentRoutes.slice(0, 2)); // Only prefetch top 2
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [currentRoute]);
};

export default useRoutePrefetch;
