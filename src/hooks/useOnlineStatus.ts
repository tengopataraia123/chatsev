import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isOnlineVisibleExempt } from '@/lib/adminExemptions';

/**
 * GLOBAL ONLINE STATUS HOOK - OPTIMIZED FOR PERFORMANCE
 * 
 * This is the SINGLE SOURCE OF TRUTH for online status across the entire application.
 * Uses global caching to prevent duplicate API calls across components.
 */

// ============= GLOBAL CACHE =============
let cachedGracePeriodMinutes: number | null = null;
let cachedGroupChatMinutes: number | null = null;
let cacheTimestamp: number = 0;
let groupCacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 60 seconds cache for settings - even longer cache for performance

// Global cache for online users data
let globalOnlineUsersCache: {
  users: OnlineUser[];
  totalCount: number;
  timestamp: number;
  gracePeriodMinutes: number;
} | null = null;

let globalGroupChatUsersCache: {
  users: OnlineUser[];
  totalCount: number;
  timestamp: number;
  gracePeriodMinutes: number;
} | null = null;

const USERS_CACHE_DURATION = 45000; // 45 seconds cache for users - significantly longer cache for performance

// Track active fetches to prevent duplicate requests
let isGlobalFetching = false;
let isGroupChatFetching = false;
const fetchPromiseGlobal: { promise: Promise<void> | null } = { promise: null };
const fetchPromiseGroupChat: { promise: Promise<void> | null } = { promise: null };

/**
 * Get the global online grace period in minutes.
 */
export const getOnlineGracePeriodMinutes = async (): Promise<number> => {
  const now = Date.now();
  
  if (cachedGracePeriodMinutes !== null && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedGracePeriodMinutes;
  }
  
  const { data } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', 'online_duration_minutes')
    .single();
  
  cachedGracePeriodMinutes = data ? parseInt(data.setting_value) || 5 : 5;
  cacheTimestamp = now;
  
  return cachedGracePeriodMinutes;
};

/**
 * Get the group chat online grace period in SECONDS.
 * Returns seconds for more granular control.
 */
export const getGroupChatOnlineSeconds = async (): Promise<number> => {
  const now = Date.now();
  
  if (cachedGroupChatMinutes !== null && (now - groupCacheTimestamp) < CACHE_DURATION) {
    return cachedGroupChatMinutes;
  }
  
  const { data } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', 'group_chat_online_minutes')
    .single();
  
  // Value is stored as minutes (2 = 2 minutes)
  cachedGroupChatMinutes = data ? parseInt(data.setting_value) || 2 : 2;
  groupCacheTimestamp = now;
  
  return cachedGroupChatMinutes;
};

/**
 * Invalidate all caches.
 */
export const invalidateGracePeriodCache = (): void => {
  cachedGracePeriodMinutes = null;
  cachedGroupChatMinutes = null;
  cacheTimestamp = 0;
  groupCacheTimestamp = 0;
  globalOnlineUsersCache = null;
  globalGroupChatUsersCache = null;
};

/**
 * Check if a user is online based on their last_seen and the global grace period.
 */
export const isUserOnlineByLastSeen = (
  lastSeen: string | Date | null,
  gracePeriodMinutes: number
): boolean => {
  if (!lastSeen) return false;
  
  const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const cutoffTime = new Date(Date.now() - gracePeriodMinutes * 60 * 1000);
  
  return lastSeenDate > cutoffTime;
};

/**
 * Calculate the cutoff time for online status queries.
 */
export const getOnlineCutoffTime = (gracePeriodMinutes: number): Date => {
  return new Date(Date.now() - gracePeriodMinutes * 60 * 1000);
};

/**
 * Hook to get the current online grace period.
 * Minimal re-renders - only fetches once on mount.
 */
export const useOnlineGracePeriod = () => {
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(cachedGracePeriodMinutes || 5);
  const [loading, setLoading] = useState(cachedGracePeriodMinutes === null);

  useEffect(() => {
    // Use cached value immediately if available
    if (cachedGracePeriodMinutes !== null) {
      setGracePeriodMinutes(cachedGracePeriodMinutes);
      setLoading(false);
      return;
    }

    getOnlineGracePeriodMinutes().then(minutes => {
      setGracePeriodMinutes(minutes);
      setLoading(false);
    });
  }, []);

  return { gracePeriodMinutes, loading };
};

/**
 * Hook to get the group chat online period in SECONDS.
 */
export const useGroupChatOnlinePeriod = () => {
  const [groupChatMinutes, setGroupChatMinutes] = useState<number>(cachedGroupChatMinutes || 2);
  const [loading, setLoading] = useState(cachedGroupChatMinutes === null);

  useEffect(() => {
    if (cachedGroupChatMinutes !== null) {
      setGroupChatMinutes(cachedGroupChatMinutes);
      setLoading(false);
      return;
    }

    getGroupChatOnlineSeconds().then(minutes => {
      setGroupChatMinutes(minutes);
      setLoading(false);
    });
  }, []);

  return { groupChatMinutes, loading };
};

interface OnlineUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  gender?: string;
  age?: number;
  last_seen: string | null;
  role?: string;
  city?: string | null;
  current_location?: string | null;
}

interface UseOnlineUsersOptions {
  limit?: number;
  includeRoles?: boolean;
  excludeInvisible?: boolean;
  useGroupChatPeriod?: boolean;
}

/**
 * OPTIMIZED Hook to fetch online users.
 * Uses global cache to prevent duplicate API calls across components.
 */
export const useOnlineUsers = (options: UseOnlineUsersOptions = {}) => {
  const { limit = 100, includeRoles = false, excludeInvisible = true, useGroupChatPeriod = false } = options;
  
  const { gracePeriodMinutes: globalPeriod, loading: globalLoading } = useOnlineGracePeriod();
  const { groupChatMinutes, loading: groupLoading } = useGroupChatOnlinePeriod();
  
  const periodLoading = useGroupChatPeriod ? groupLoading : globalLoading;
  // For group chat, use minutes directly (no conversion needed)
  const gracePeriodMinutes = useGroupChatPeriod ? groupChatMinutes : globalPeriod;
  
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchOnlineUsers = useCallback(async (forceRefresh = false) => {
    if (periodLoading) return;
    
    const cache = useGroupChatPeriod ? globalGroupChatUsersCache : globalOnlineUsersCache;
    const now = Date.now();
    
    // Return cached data if valid and grace period matches (unless forced)
    if (!forceRefresh && cache && 
        (now - cache.timestamp) < USERS_CACHE_DURATION && 
        cache.gracePeriodMinutes === gracePeriodMinutes) {
      if (mountedRef.current) {
        setUsers(cache.users.slice(0, limit));
        setTotalCount(cache.totalCount);
        setLoading(false);
      }
      return;
    }
    
    // Invalidate cache on force refresh
    if (forceRefresh) {
      if (useGroupChatPeriod) {
        globalGroupChatUsersCache = null;
      } else {
        globalOnlineUsersCache = null;
      }
    }
    
    // Prevent duplicate concurrent fetches
    const isFetching = useGroupChatPeriod ? isGroupChatFetching : isGlobalFetching;
    const fetchPromise = useGroupChatPeriod ? fetchPromiseGroupChat : fetchPromiseGlobal;
    
    if (isFetching && fetchPromise.promise) {
      await fetchPromise.promise;
      const updatedCache = useGroupChatPeriod ? globalGroupChatUsersCache : globalOnlineUsersCache;
      if (updatedCache && mountedRef.current) {
        setUsers(updatedCache.users.slice(0, limit));
        setTotalCount(updatedCache.totalCount);
        setLoading(false);
      }
      return;
    }
    
    // Set fetching flag
    if (useGroupChatPeriod) {
      isGroupChatFetching = true;
    } else {
      isGlobalFetching = true;
    }
    
    setLoading(true);
    
    const fetchData = async () => {
      try {
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const cutoffTime = getOnlineCutoffTime(gracePeriodMinutes).toISOString();
        
        // Single optimized query - fetch online users with reasonable limit
        const { data: profiles, count: totalOnlineCount, error } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender, age, last_seen, city, current_location', { count: 'exact' })
          .gt('last_seen', cutoffTime)
          .order('last_seen', { ascending: false })
          .limit(200); // Reduced from 1000 for better performance

        clearTimeout(timeoutId);

        if (error || !profiles || profiles.length === 0) {
          const emptyCache = { users: [], totalCount: 0, timestamp: now, gracePeriodMinutes };
          if (useGroupChatPeriod) {
            globalGroupChatUsersCache = emptyCache;
          } else {
            globalOnlineUsersCache = emptyCache;
          }
          if (mountedRef.current) {
            setUsers([]);
            setTotalCount(0);
            setLoading(false);
          }
          return;
        }

        let processedUsers: OnlineUser[] = profiles;
        let actualCount = totalOnlineCount || profiles.length;

        // Filter invisible users if needed (batch query)
        if (excludeInvisible && profiles.length > 0) {
          const userIds = profiles.map(p => p.user_id);
          
          const { data: invisibleUsers } = await supabase
            .from('privacy_settings')
            .select('user_id')
            .in('user_id', userIds)
            .eq('is_invisible', true);
          
          if (invisibleUsers && invisibleUsers.length > 0) {
            const { isOnlineVisibleExempt } = await import('@/lib/adminExemptions');
            const invisibleSet = new Set(
              invisibleUsers
                .filter(u => !isOnlineVisibleExempt(u.user_id))
                .map(u => u.user_id)
            );
            processedUsers = profiles.filter(p => !invisibleSet.has(p.user_id));
            actualCount = Math.max(0, (totalOnlineCount || 0) - invisibleSet.size);
          }
        }

        // ALWAYS fetch roles for all online users (needed for admin filtering)
        if (processedUsers.length > 0) {
          const userIds = processedUsers.map(p => p.user_id);
          
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', userIds);
          
          if (!rolesError && roles && roles.length > 0) {
            // Build role map - prioritize highest role (super_admin > admin > moderator > user)
            const rolesPriority: Record<string, number> = { 
              'super_admin': 4, 
              'admin': 3, 
              'moderator': 2, 
              'user': 1 
            };
            const rolesMap = new Map<string, string>();
            
            for (const r of roles) {
              const existingRole = rolesMap.get(r.user_id);
              if (!existingRole || (rolesPriority[r.role] || 0) > (rolesPriority[existingRole] || 0)) {
                rolesMap.set(r.user_id, r.role);
              }
            }
            
            processedUsers = processedUsers.map(user => ({
              ...user,
              role: rolesMap.get(user.user_id) || 'user'
            }));
          } else {
            // No roles found - set all as 'user'
            processedUsers = processedUsers.map(user => ({
              ...user,
              role: 'user'
            }));
          }
        }

        // Update global cache
        const newCache = {
          users: processedUsers,
          totalCount: Math.max(0, actualCount),
          timestamp: now,
          gracePeriodMinutes
        };
        
        if (useGroupChatPeriod) {
          globalGroupChatUsersCache = newCache;
        } else {
          globalOnlineUsersCache = newCache;
        }

        if (mountedRef.current) {
          setUsers(processedUsers.slice(0, limit));
          setTotalCount(Math.max(0, actualCount));
        }
      } catch (error) {
        console.error('Error in fetchOnlineUsers:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        if (useGroupChatPeriod) {
          isGroupChatFetching = false;
        } else {
          isGlobalFetching = false;
        }
      }
    };
    
    fetchPromise.promise = fetchData();
    await fetchPromise.promise;
    fetchPromise.promise = null;
    
  }, [gracePeriodMinutes, periodLoading, limit, includeRoles, excludeInvisible, useGroupChatPeriod]);

  useEffect(() => {
    mountedRef.current = true;
    fetchOnlineUsers();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchOnlineUsers]);

  return { users, totalCount, loading, refetch: fetchOnlineUsers, gracePeriodMinutes };
};

/**
 * Check if a specific user is online.
 */
export const checkUserOnline = async (
  targetUserId: string,
  viewerId: string | null
): Promise<{ isOnline: boolean; lastSeen: string | null }> => {
  const gracePeriodMinutes = await getOnlineGracePeriodMinutes();
  
  if (viewerId === targetUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_seen')
      .eq('user_id', targetUserId)
      .single();
    
    return {
      isOnline: isUserOnlineByLastSeen(profile?.last_seen, gracePeriodMinutes),
      lastSeen: profile?.last_seen || null
    };
  }
  
  const { data: privacySettings } = await supabase
    .from('privacy_settings')
    .select('is_invisible')
    .eq('user_id', targetUserId)
    .maybeSingle();
  
  if (privacySettings?.is_invisible) {
    const { isOnlineVisibleExempt } = await import('@/lib/adminExemptions');
    if (!isOnlineVisibleExempt(targetUserId)) {
      return { isOnline: false, lastSeen: null };
    }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_seen')
    .eq('user_id', targetUserId)
    .single();
  
  return {
    isOnline: isUserOnlineByLastSeen(profile?.last_seen, gracePeriodMinutes),
    lastSeen: profile?.last_seen || null
  };
};

/**
 * Synchronous check if a user is online.
 */
export const isUserOnlineSync = (
  user: { last_seen: string | null },
  privacySettings: { is_invisible: boolean } | null,
  gracePeriodMinutes: number,
  isOwnProfile: boolean = false,
  userId?: string
): boolean => {
  if (isOwnProfile) {
    return isUserOnlineByLastSeen(user.last_seen, gracePeriodMinutes);
  }
  
  if (privacySettings?.is_invisible) {
    // Exempt admins are still shown as online
    if (userId && isOnlineVisibleExempt(userId)) {
      return isUserOnlineByLastSeen(user.last_seen, gracePeriodMinutes);
    }
    return false;
  }
  
  return isUserOnlineByLastSeen(user.last_seen, gracePeriodMinutes);
};
