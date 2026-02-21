import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IpBanInfo {
  is_banned: boolean;
  ban_id: string | null;
  reason: string | null;
  banned_until: string | null;
  banned_at: string | null;
}

const IP_CHECK_TIMEOUT = 5000;

// Get client IP from various methods - deferred and non-blocking
let cachedClientIp: string | null = null;
let ipFetchInProgress = false;

const getClientIp = async (): Promise<string | null> => {
  if (cachedClientIp) return cachedClientIp;
  if (ipFetchInProgress) return null;
  
  ipFetchInProgress = true;
  try {
    // Try to get IP from a free API with very short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    cachedClientIp = data.ip || null;
    return cachedClientIp;
  } catch {
    return null;
  } finally {
    ipFetchInProgress = false;
  }
};

export const useIpBan = () => {
  const [ipBanInfo, setIpBanInfo] = useState<IpBanInfo | null>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const checkInProgress = useRef(false);
  const isMounted = useRef(true);
  const hasChecked = useRef(false);

  const checkIpBan = useCallback(async (ip: string) => {
    if (!ip || checkInProgress.current) return;
    checkInProgress.current = true;

    if (!hasChecked.current) {
      setLoading(true);
    }

    try {
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('IP ban check timeout')), IP_CHECK_TIMEOUT);
      });

      const result = await Promise.race([
        supabase.rpc('check_ip_ban', { check_ip: ip }),
        timeoutPromise
      ]);

      const { data, error } = result as any;

      if (!isMounted.current) return;

      if (error) {
        console.warn('Error checking IP ban:', error);
        setIpBanInfo(null);
      } else if (data && data.length > 0 && data[0].is_banned) {
        setIpBanInfo({
          is_banned: true,
          ban_id: data[0].ban_id,
          reason: data[0].reason,
          banned_until: data[0].banned_until,
          banned_at: data[0].banned_at
        });
      } else {
        setIpBanInfo(null);
      }
      hasChecked.current = true;
    } catch (error) {
      console.warn('IP ban check failed or timed out:', error);
      if (isMounted.current) {
        setIpBanInfo(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      checkInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    hasChecked.current = false;

    // Defer IP check to not block initial render - run after 2 seconds
    const initTimeout = setTimeout(async () => {
      const ip = await getClientIp();
      if (ip && isMounted.current) {
        setClientIp(ip);
        await checkIpBan(ip);
      }
    }, 2000);

    // Check every 3 minutes (less frequent)
    const interval = setInterval(async () => {
      if (clientIp) {
        await checkIpBan(clientIp);
      }
    }, 180000);

    return () => {
      isMounted.current = false;
      clearTimeout(initTimeout);
      clearInterval(interval);
    };
  }, [checkIpBan, clientIp]);

  // Subscribe to realtime IP ban changes
  useEffect(() => {
    if (!clientIp) return;

    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel('ip-ban-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ip_bans'
          },
          () => {
            checkIpBan(clientIp);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [clientIp, checkIpBan]);

  return { ipBanInfo, clientIp, loading, recheckIpBan: () => clientIp && checkIpBan(clientIp) };
};
