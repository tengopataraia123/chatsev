import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BanInfo {
  is_banned: boolean;
  ban_id: string | null;
  block_type: string | null;
  reason: string | null;
  banned_until: string | null;
  banned_at: string | null;
}

const BAN_CHECK_TIMEOUT = 5000; // 5 seconds timeout

export const useSiteBan = (userId: string | null) => {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [loading, setLoading] = useState(false); // Start with false - don't block UI
  const checkInProgress = useRef(false);
  const isMounted = useRef(true);
  const hasChecked = useRef(false);

  const checkBan = useCallback(async () => {
    if (!userId) {
      setBanInfo(null);
      setLoading(false);
      return;
    }

    // Prevent concurrent checks
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    // Only set loading on first check
    if (!hasChecked.current) {
      setLoading(true);
    }

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Ban check timeout')), BAN_CHECK_TIMEOUT);
      });

      // Race between the actual query and timeout
      const result = await Promise.race([
        supabase.rpc('get_user_site_ban', { _user_id: userId }),
        timeoutPromise
      ]);

      // If timeout won, result would have thrown
      const { data, error } = result as any;

      if (!isMounted.current) return;

      if (error) {
        console.warn('Error checking ban:', error);
        setBanInfo(null);
      } else if (data && data.length > 0 && data[0].is_banned) {
        setBanInfo({
          is_banned: true,
          ban_id: data[0].ban_id,
          block_type: data[0].block_type,
          reason: data[0].reason,
          banned_until: data[0].banned_until,
          banned_at: data[0].banned_at
        });
      } else {
        setBanInfo(null);
      }
      hasChecked.current = true;
    } catch (error) {
      console.warn('Ban check failed or timed out:', error);
      // On timeout/error, assume not banned to avoid blocking the app
      if (isMounted.current) {
        setBanInfo(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      checkInProgress.current = false;
    }
  }, [userId]);

  useEffect(() => {
    isMounted.current = true;
    hasChecked.current = false;
    
    // Defer ban check to not block initial render
    const initTimeout = setTimeout(checkBan, 1500);

    // Check every 3 minutes - less frequent
    const interval = setInterval(checkBan, 180000);

    return () => {
      isMounted.current = false;
      clearTimeout(initTimeout);
      clearInterval(interval);
    };
  }, [checkBan]);

  // Subscribe to realtime ban changes - deferred to not block page load
  useEffect(() => {
    if (!userId) return;

    // Delay subscription to not block initial render
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel('site-ban-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'site_bans',
            filter: `user_id=eq.${userId}`
          },
          () => {
            // Recheck ban status when changes occur
            checkBan();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, 5000); // Delay by 5 seconds

    return () => {
      clearTimeout(timeoutId);
    };
  }, [userId, checkBan]);

  return { banInfo, loading, recheckBan: checkBan };
};
