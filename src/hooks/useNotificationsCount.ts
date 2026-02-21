import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { NOTIFICATION_REFRESH_EVENT } from '@/utils/notificationEvents';

export const useNotificationsCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);
  const [unreadSystemMessagesCount, setUnreadSystemMessagesCount] = useState(0);
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);
  const { user, userRole } = useAuth();
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);

  const isSuperAdmin = userRole === 'super_admin';

  const fetchUnreadCount = useCallback(async (force = false) => {
    if (!user?.id) return;

    // Debounce - don't fetch more than once per second unless forced
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 1000) return;
    lastFetchTime.current = now;

    try {
      // Fetch regular notifications count
      const { count: notifCount, error: notifError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (notifError) {
        console.error('Error fetching notification count:', notifError);
      }

      // Fetch unread system broadcasts count - use data length as fallback
      const { data: broadcastData, count: broadcastCount, error: broadcastError } = await supabase
        .from('system_broadcast_recipients')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .is('seen_at', null);

      if (broadcastError) {
        console.error('Error fetching broadcast count:', broadcastError);
      }

      // Fetch unread system messages count (new system messages feature)
      const { data: systemMsgData, count: systemMsgCount, error: systemMsgError } = await supabase
        .from('system_message_deliveries')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .is('opened_at', null);

      if (systemMsgError) {
        console.error('Error fetching system message count:', systemMsgError);
      }

      // Fetch new reports count for super admins
      let reportsCount = 0;
      if (isSuperAdmin) {
        const { count: rCount, error: reportsError } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new');

        if (!reportsError) {
          reportsCount = rCount || 0;
        }
      }

      // Use count if available, otherwise use data length
      const actualBroadcastCount = broadcastCount ?? broadcastData?.length ?? 0;
      const actualSystemMsgCount = systemMsgCount ?? systemMsgData?.length ?? 0;

      if (isMounted.current) {
        setUnreadCount(notifCount || 0);
        setUnreadBroadcastCount(actualBroadcastCount);
        setUnreadSystemMessagesCount(actualSystemMsgCount);
        setUnreadReportsCount(reportsCount);
      }
    } catch (error) {
      console.error('Error in fetchUnreadCount:', error);
    }
  }, [user?.id, isSuperAdmin]);

  // Optimistic increment for new notifications
  const incrementCount = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  // Optimistic decrement for read notifications
  const decrementCount = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Reset to zero (e.g., mark all as read)
  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    if (!user?.id) return;

    // Deferred initial fetch - don't block initial page render
    const timer = setTimeout(() => {
      fetchUnreadCount(true);
    }, 600);
    
    // Subscribe to notification changes - immediate updates
    const notifChannel = supabase
      .channel(`notifications-count-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          if (!isMounted.current) return;
          // Optimistically increment, then verify
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          // Check if notification was marked as read
          if (newData?.is_read === true && oldData?.is_read === false) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const oldData = payload.old as any;
          // If deleted notification was unread, decrement
          if (oldData?.is_read === false) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Subscribe to system broadcast changes
    const broadcastChannel = supabase
      .channel(`broadcast-count-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_broadcast_recipients',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          if (!newData?.seen_at) {
            setUnreadBroadcastCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_broadcast_recipients',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.seen_at && !oldData?.seen_at) {
            setUnreadBroadcastCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Subscribe to system message deliveries changes
    const systemMsgChannel = supabase
      .channel(`system-msg-count-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_message_deliveries',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          if (!newData?.opened_at) {
            setUnreadSystemMessagesCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_message_deliveries',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.opened_at && !oldData?.opened_at) {
            setUnreadSystemMessagesCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Subscribe to reports changes for super admins
    let reportsChannel: any = null;
    if (isSuperAdmin) {
      reportsChannel = supabase
        .channel(`reports-count-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'reports'
          },
          () => {
            if (!isMounted.current) return;
            setUnreadReportsCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'reports'
          },
          (payload) => {
            if (!isMounted.current) return;
            const newData = payload.new as any;
            const oldData = payload.old as any;
            if (oldData?.status === 'new' && newData?.status !== 'new') {
              setUnreadReportsCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    }

    // Backup poll every 60 seconds (reduced from 30)
    const pollInterval = setInterval(() => {
      if (isMounted.current) {
        fetchUnreadCount();
      }
    }, 60000);

    // Listen for global refresh events (triggered by bulk operations)
    const handleGlobalRefresh = () => {
      if (isMounted.current) {
        fetchUnreadCount(true);
      }
    };
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, handleGlobalRefresh);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      clearInterval(pollInterval);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(systemMsgChannel);
      if (reportsChannel) supabase.removeChannel(reportsChannel);
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, handleGlobalRefresh);
    };
  }, [user?.id, fetchUnreadCount, isSuperAdmin]);

  // Return count - bell badge shows regular notifications + reports for super admins
  return {
    unreadCount: unreadCount + unreadReportsCount, // Bell badge - notifications + reports for super admins
    notificationCount: unreadCount,
    broadcastCount: unreadBroadcastCount,
    systemMessagesCount: unreadSystemMessagesCount,
    reportsCount: unreadReportsCount,
    refetch: fetchUnreadCount,
    incrementCount,
    decrementCount,
    resetCount
  };
};
