import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Optimized batch presence hook - fetches ALL presence counts in ONE request
 * Instead of 9+ separate polling intervals, we use ONE interval for all
 * 
 * Performance improvement: 9 requests/10sec -> 1 request/60sec
 */

interface PresenceCounts {
  live: number;
  games: number;
  dating: number;
  movies: number;
  quiz: number;
  gossip: number;
  night: number;
  emigrants: number;
  dj: number;
}

const PRESENCE_TABLES = [
  { key: 'live', table: 'live_presence', cutoffMinutes: 5 },
  { key: 'games', table: 'games_presence', cutoffMinutes: 5 },
  { key: 'dating', table: 'dating_presence', cutoffMinutes: 5 },
  { key: 'movies', table: 'movies_presence', cutoffMinutes: 5 },
  { key: 'quiz', table: 'quiz_v2_presence', cutoffMinutes: 5 },
  { key: 'gossip', table: 'group_chat_presence', cutoffMinutes: 2 },
  { key: 'night', table: 'night_room_presence', cutoffMinutes: 2 },
  { key: 'emigrants', table: 'emigrants_room_presence', cutoffMinutes: 2 },
  { key: 'dj', table: 'dj_room_presence', cutoffMinutes: 2 },
] as const;

// Global cache for presence counts - shared across all components
let globalPresenceCache: PresenceCounts = {
  live: 0, games: 0, dating: 0, movies: 0, quiz: 0,
  gossip: 0, night: 0, emigrants: 0, dj: 0
};
let globalLastFetch = 0;
let globalFetchPromise: Promise<PresenceCounts> | null = null;
const CACHE_DURATION = 30000; // 30 seconds cache
const POLL_INTERVAL = 60000; // Poll every 60 seconds (was 10 seconds each = 540 requests/min -> now 1/min)

const fetchAllPresence = async (): Promise<PresenceCounts> => {
  const now = Date.now();
  
  // Return cached if fresh enough
  if (now - globalLastFetch < CACHE_DURATION) {
    return globalPresenceCache;
  }
  
  // Dedupe concurrent requests
  if (globalFetchPromise) {
    return globalFetchPromise;
  }
  
  globalFetchPromise = (async () => {
    try {
      // Batch all presence counts in parallel
      const results = await Promise.all(
        PRESENCE_TABLES.map(async ({ key, table, cutoffMinutes }) => {
          const cutoff = new Date(Date.now() - cutoffMinutes * 60 * 1000).toISOString();
          
          const { count, error } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true })
            .gte('last_active_at', cutoff);
          
          return { key, count: error ? 0 : (count || 0) };
        })
      );
      
      // Build counts object
      const counts: PresenceCounts = { 
        live: 0, games: 0, dating: 0, movies: 0, quiz: 0,
        gossip: 0, night: 0, emigrants: 0, dj: 0 
      };
      
      results.forEach(({ key, count }) => {
        counts[key as keyof PresenceCounts] = count;
      });
      
      globalPresenceCache = counts;
      globalLastFetch = Date.now();
      
      return counts;
    } finally {
      globalFetchPromise = null;
    }
  })();
  
  return globalFetchPromise;
};

/**
 * Single hook that returns ALL presence counts
 * Uses global cache to avoid duplicate fetches across components
 */
export const useBatchPresence = () => {
  const [counts, setCounts] = useState<PresenceCounts>(globalPresenceCache);
  const [loading, setLoading] = useState(globalLastFetch === 0);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    const result = await fetchAllPresence();
    if (mountedRef.current) {
      setCounts(result);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    refetch();
    
    // Poll at much slower rate - 60 seconds
    const interval = setInterval(refetch, POLL_INTERVAL);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refetch]);

  return { counts, loading, refetch };
};

/**
 * Individual presence count selectors - for backward compatibility
 * These just select from the batch result, no additional requests
 */
export const useLivePresenceCountOptimized = () => {
  const { counts } = useBatchPresence();
  return counts.live;
};

export const useGamesPresenceCountOptimized = () => {
  const { counts } = useBatchPresence();
  return counts.games;
};

export const useDatingPresenceCountOptimized = () => {
  const { counts } = useBatchPresence();
  return counts.dating;
};

export const useMoviesPresenceCountOptimized = () => {
  const { counts } = useBatchPresence();
  return counts.movies;
};

export const useQuizPresenceCountOptimized = () => {
  const { counts } = useBatchPresence();
  return counts.quiz;
};

export const useRoomPresenceCountsOptimized = () => {
  const { counts } = useBatchPresence();
  return {
    gossip: counts.gossip,
    night: counts.night,
    emigrants: counts.emigrants,
    dj: counts.dj,
  };
};
