import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserChatStatus {
  user_id: string;
  is_muted: boolean;
  is_banned: boolean;
  muted_until: string | null;
  banned_until: string | null;
  muted_by?: string | null;
  banned_by?: string | null;
}

interface StatusUpdate {
  is_muted?: boolean;
  is_banned?: boolean;
  muted_until?: string | null;
  banned_until?: string | null;
  muted_by?: string | null;
  banned_by?: string | null;
  updated_at: string;
}

/**
 * Check if a mute/ban has expired based on the until timestamp
 */
export const isStatusExpired = (untilTimestamp: string | null): boolean => {
  if (!untilTimestamp) return false; // No expiry = permanent
  return new Date(untilTimestamp) < new Date();
};

/**
 * Get effective status considering expiration time
 */
export const getEffectiveStatus = (status: UserChatStatus | null): {
  isMuted: boolean;
  isBanned: boolean;
} => {
  if (!status) return { isMuted: false, isBanned: false };
  
  const isMuted = status.is_muted && !isStatusExpired(status.muted_until);
  const isBanned = status.is_banned && !isStatusExpired(status.banned_until);
  
  return { isMuted, isBanned };
};

/**
 * Hook to manage user chat status with automatic expiration handling
 */
export const useChatStatus = (userId: string | undefined) => {
  const [myStatus, setMyStatus] = useState<UserChatStatus | null>(null);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserChatStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const cleanupInProgress = useRef(false);
  const isMounted = useRef(true);

  /**
   * Cleanup expired mutes/bans in the database for the current user
   */
  const cleanupExpiredStatus = useCallback(async (status: UserChatStatus) => {
    if (cleanupInProgress.current) return;
    
    const now = new Date().toISOString();
    const updates: StatusUpdate = { updated_at: now };
    let needsUpdate = false;

    // Check if mute expired
    if (status.is_muted && status.muted_until && isStatusExpired(status.muted_until)) {
      updates.is_muted = false;
      updates.muted_until = null;
      updates.muted_by = null;
      needsUpdate = true;
    }

    // Check if ban expired
    if (status.is_banned && status.banned_until && isStatusExpired(status.banned_until)) {
      updates.is_banned = false;
      updates.banned_until = null;
      updates.banned_by = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      cleanupInProgress.current = true;
      try {
        const { error } = await supabase
          .from('user_chat_status')
          .update(updates as any)
          .eq('user_id', status.user_id);

        if (error) {
          console.warn('Failed to cleanup expired status:', error);
        } else {
          console.log('Cleaned up expired mute/ban for user:', status.user_id);
        }
      } catch (err) {
        console.warn('Error during status cleanup:', err);
      } finally {
        cleanupInProgress.current = false;
      }
    }
  }, []);

  /**
   * Fetch user statuses and process expirations
   */
  const fetchUserStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_chat_status')
        .select('*');

      if (error) {
        console.error('Error fetching user statuses:', error);
        return;
      }

      if (!isMounted.current) return;

      if (data) {
        const statusMap = new Map<string, UserChatStatus>();
        
        for (const status of data) {
          statusMap.set(status.user_id, status);
          
          // If this is the current user's status
          if (userId && status.user_id === userId) {
            setMyStatus(status);
            
            // Cleanup expired mutes/bans for current user
            if (
              (status.is_muted && status.muted_until && isStatusExpired(status.muted_until)) ||
              (status.is_banned && status.banned_until && isStatusExpired(status.banned_until))
            ) {
              await cleanupExpiredStatus(status);
              // Re-fetch after cleanup
              const { data: updatedData } = await supabase
                .from('user_chat_status')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
              
              if (updatedData && isMounted.current) {
                setMyStatus(updatedData);
                statusMap.set(userId, updatedData);
              }
            }
          }
        }
        
        if (isMounted.current) {
          setUserStatuses(statusMap);
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userId, cleanupExpiredStatus]);

  /**
   * Get effective status for a user (considering expiration)
   */
  const getEffectiveUserStatus = useCallback((targetUserId: string) => {
    const status = userStatuses.get(targetUserId);
    return getEffectiveStatus(status || null);
  }, [userStatuses]);

  /**
   * Check if current user is effectively muted
   */
  const isEffectivelyMuted = useCallback(() => {
    return getEffectiveStatus(myStatus).isMuted;
  }, [myStatus]);

  /**
   * Check if current user is effectively banned
   */
  const isEffectivelyBanned = useCallback(() => {
    return getEffectiveStatus(myStatus).isBanned;
  }, [myStatus]);

  useEffect(() => {
    isMounted.current = true;
    
    if (userId) {
      fetchUserStatuses();
    }

    // Periodic check for expiration (every 30 seconds)
    const interval = setInterval(() => {
      if (myStatus) {
        const { isMuted, isBanned } = getEffectiveStatus(myStatus);
        
        // If status changed due to expiration, refresh
        if (
          (myStatus.is_muted && !isMuted) ||
          (myStatus.is_banned && !isBanned)
        ) {
          fetchUserStatuses();
        }
      }
    }, 30000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [userId, fetchUserStatuses, myStatus]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('chat-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_chat_status',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUserStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUserStatuses]);

  return {
    myStatus,
    userStatuses,
    loading,
    isEffectivelyMuted,
    isEffectivelyBanned,
    getEffectiveUserStatus,
    refresh: fetchUserStatuses,
  };
};
