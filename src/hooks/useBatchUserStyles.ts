import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsernameStyle {
  text_color: string;
  gradient_start: string | null;
  gradient_end: string | null;
  use_gradient: boolean;
  font_weight: string;
  font_style: string;
  text_decoration: string;
  text_shadow: string | null;
  glow_color: string | null;
  glow_intensity: number;
  background_color: string | null;
  border_color: string | null;
  border_width: number;
  border_radius: number;
  animation: string;
  prefix_emoji: string | null;
  suffix_emoji: string | null;
  font_size?: number;
  font_family?: string;
}

interface UserStyleData {
  style: UsernameStyle | null;
  vipType: string | null;
  isVerified: boolean;
}

// Global cache with 5-minute TTL
const styleCache = new Map<string, { data: UserStyleData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Batch fetch username styles and VIP data for multiple users in ONE query each
 * Solves N+1 query problem by fetching all users at once
 */
export const useBatchUserStyles = (userIds: string[]) => {
  const [stylesMap, setStylesMap] = useState<Map<string, UserStyleData>>(new Map());
  const [loading, setLoading] = useState(true);
  const lastFetchedRef = useRef<string>('');

  const fetchBatch = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    // Create stable key to prevent refetch on same data
    const fetchKey = ids.sort().join(',');
    if (fetchKey === lastFetchedRef.current) {
      setLoading(false);
      return;
    }

    // Check cache first
    const now = Date.now();
    const cachedResults = new Map<string, UserStyleData>();
    const uncachedIds: string[] = [];

    ids.forEach(id => {
      const cached = styleCache.get(id);
      if (cached && now - cached.timestamp < CACHE_TTL) {
        cachedResults.set(id, cached.data);
      } else {
        uncachedIds.push(id);
      }
    });

    // If all cached, use cache
    if (uncachedIds.length === 0) {
      setStylesMap(cachedResults);
      setLoading(false);
      lastFetchedRef.current = fetchKey;
      return;
    }

    try {
      // BATCH: Single query for styles, single query for VIPs
      const [stylesResult, vipResult, profilesResult] = await Promise.all([
        supabase
          .from('username_styles')
          .select('*')
          .in('user_id', uncachedIds),
        supabase
          .from('vip_purchases')
          .select('user_id, vip_type')
          .in('user_id', uncachedIds)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString()),
        supabase
          .from('profiles')
          .select('user_id, is_verified')
          .in('user_id', uncachedIds)
      ]);

      // Build maps for quick lookup
      const stylesLookup = new Map<string, UsernameStyle>();
      stylesResult.data?.forEach(s => stylesLookup.set(s.user_id, s as UsernameStyle));

      const vipLookup = new Map<string, string>();
      vipResult.data?.forEach(v => {
        // Only keep first (most recent) VIP for each user
        if (!vipLookup.has(v.user_id)) {
          vipLookup.set(v.user_id, v.vip_type);
        }
      });

      const verifiedLookup = new Map<string, boolean>();
      profilesResult.data?.forEach(p => verifiedLookup.set(p.user_id, p.is_verified || false));

      // Combine results and cache
      const newMap = new Map<string, UserStyleData>(cachedResults);
      
      uncachedIds.forEach(id => {
        const data: UserStyleData = {
          style: stylesLookup.get(id) || null,
          vipType: vipLookup.get(id) || null,
          isVerified: verifiedLookup.get(id) || false,
        };
        newMap.set(id, data);
        styleCache.set(id, { data, timestamp: now });
      });

      setStylesMap(newMap);
      lastFetchedRef.current = fetchKey;
    } catch (error) {
      console.error('[useBatchUserStyles] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const validIds = userIds.filter(id => id && id.trim() !== '');
    fetchBatch(validIds);
  }, [userIds.join(','), fetchBatch]);

  return { stylesMap, loading };
};

/**
 * Clear cache for a specific user (call when user updates their style)
 */
export const clearUserStyleCache = (userId: string) => {
  styleCache.delete(userId);
};

/**
 * Clear all style cache
 */
export const clearAllStyleCache = () => {
  styleCache.clear();
};

