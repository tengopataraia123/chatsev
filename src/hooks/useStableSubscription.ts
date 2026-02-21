import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionConfig {
  channelName: string;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onData: (payload: any) => void;
  enabled?: boolean;
}

/**
 * A stable subscription hook that properly manages Supabase realtime subscriptions
 * Prevents memory leaks and duplicate subscriptions
 */
export const useStableSubscription = (config: SubscriptionConfig) => {
  const { channelName, table, event = '*', filter, onData, enabled = true } = config;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMounted = useRef(true);
  const subscriptionId = useRef(`${channelName}-${Date.now()}`);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    
    if (!enabled) {
      cleanup();
      return;
    }

    // Create a unique channel name to avoid conflicts
    const uniqueChannelName = `${channelName}-${subscriptionId.current}`;
    
    // Build subscription config
    const subscriptionConfig: any = {
      event,
      schema: 'public',
      table,
    };
    
    if (filter) {
      subscriptionConfig.filter = filter;
    }

    // Create channel
    channelRef.current = supabase
      .channel(uniqueChannelName)
      .on('postgres_changes', subscriptionConfig, (payload) => {
        if (isMounted.current) {
          onData(payload);
        }
      })
      .subscribe();

    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [channelName, table, event, filter, enabled, onData, cleanup]);

  return { cleanup };
};

/**
 * Hook for multiple subscriptions with automatic cleanup
 */
export const useMultipleSubscriptions = (
  configs: SubscriptionConfig[],
  deps: any[] = []
) => {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMounted = useRef(true);

  const cleanupAll = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  useEffect(() => {
    isMounted.current = true;
    cleanupAll();

    const enabledConfigs = configs.filter(c => c.enabled !== false);
    
    enabledConfigs.forEach((config, index) => {
      const { channelName, table, event = '*', filter, onData } = config;
      const uniqueChannelName = `${channelName}-${index}-${Date.now()}`;
      
      const subscriptionConfig: any = {
        event,
        schema: 'public',
        table,
      };
      
      if (filter) {
        subscriptionConfig.filter = filter;
      }

      const channel = supabase
        .channel(uniqueChannelName)
        .on('postgres_changes', subscriptionConfig, (payload) => {
          if (isMounted.current) {
            onData(payload);
          }
        })
        .subscribe();
      
      channelsRef.current.push(channel);
    });

    return () => {
      isMounted.current = false;
      cleanupAll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { cleanupAll };
};

export default useStableSubscription;
