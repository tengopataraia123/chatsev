import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionConfig {
  channelName: string;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onData: (payload: any) => void;
  enabled?: boolean;
  debounceMs?: number;
  deferMs?: number; // Delay before subscribing
}

/**
 * Optimized subscription hook with:
 * - Debouncing to prevent rapid re-renders
 * - Deferred initialization to not block initial render
 * - Proper cleanup
 * - Mounting safety
 */
export const useOptimizedSubscription = ({
  channelName,
  table,
  event = '*',
  filter,
  onData,
  enabled = true,
  debounceMs = 300,
  deferMs = 2000, // Default 2 second defer
}: SubscriptionConfig) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMounted = useRef(true);
  const lastCallTime = useRef(0);
  const pendingCallback = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback((payload: any) => {
    if (!isMounted.current) return;
    
    const now = Date.now();
    if (now - lastCallTime.current < debounceMs) {
      // Debounce - schedule for later
      if (pendingCallback.current) {
        clearTimeout(pendingCallback.current);
      }
      pendingCallback.current = setTimeout(() => {
        if (isMounted.current) {
          lastCallTime.current = Date.now();
          onData(payload);
        }
      }, debounceMs);
    } else {
      lastCallTime.current = now;
      onData(payload);
    }
  }, [onData, debounceMs]);

  useEffect(() => {
    isMounted.current = true;

    if (!enabled) return;

    // Defer subscription to not block initial render
    const deferTimeout = setTimeout(() => {
      if (!isMounted.current) return;

      const subscriptionConfig: any = {
        event,
        schema: 'public',
        table,
      };

      if (filter) {
        subscriptionConfig.filter = filter;
      }

      channelRef.current = supabase
        .channel(channelName)
        .on('postgres_changes', subscriptionConfig, debouncedCallback)
        .subscribe();
    }, deferMs);

    return () => {
      isMounted.current = false;
      clearTimeout(deferTimeout);
      if (pendingCallback.current) {
        clearTimeout(pendingCallback.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, table, event, filter, enabled, deferMs, debouncedCallback]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return { cleanup };
};

/**
 * Batch multiple subscriptions with a single setup/cleanup
 */
export const useOptimizedBatchSubscriptions = (
  configs: SubscriptionConfig[],
  deps: any[] = []
) => {
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Defer all subscriptions
    const deferTimeout = setTimeout(() => {
      if (!isMounted.current) return;

      configs.forEach((config, index) => {
        if (!config.enabled) return;

        const subscriptionConfig: any = {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
        };

        if (config.filter) {
          subscriptionConfig.filter = config.filter;
        }

        const channel = supabase
          .channel(`${config.channelName}-${index}`)
          .on('postgres_changes', subscriptionConfig, (payload) => {
            if (isMounted.current) {
              config.onData(payload);
            }
          })
          .subscribe();

        channelsRef.current.push(channel);
      });
    }, 3000); // 3 second defer for batch

    return () => {
      isMounted.current = false;
      clearTimeout(deferTimeout);
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, deps);

  const cleanupAll = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  return { cleanupAll };
};
