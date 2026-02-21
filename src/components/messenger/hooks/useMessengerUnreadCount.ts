/**
 * Hook for tracking total unread messenger messages count
 * Used for badge display in navigation
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MESSAGES_REFRESH_EVENT } from '@/utils/notificationEvents';

export function useMessengerUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);
  const conversationIdsRef = useRef<string[]>([]);

  const fetchUnreadCount = useCallback(async (force = false) => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    // Debounce - don't fetch more than once per 500ms unless forced
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 500) return;
    lastFetchTime.current = now;

    try {
      // Get all conversations where user is participant
      const { data: convs, error: convError } = await supabase
        .from('messenger_conversations')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return;
      }

      if (!convs || convs.length === 0) {
        if (isMounted.current) setUnreadCount(0);
        return;
      }

      const conversationIds = convs.map(c => c.id);
      conversationIdsRef.current = conversationIds;

      // Get user's conversation deletion records
      const { data: deletionRecords } = await supabase
        .from('messenger_conversation_deletions')
        .select('conversation_id, deleted_at')
        .eq('user_id', user.id)
        .in('conversation_id', conversationIds);

      const deletedConvMap = new Map<string, string>();
      deletionRecords?.forEach(d => {
        deletedConvMap.set(d.conversation_id, d.deleted_at);
      });

      // Count unread messages (not from current user, not read)
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('messenger_messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (unreadError) {
        console.error('Error fetching unread messages:', unreadError);
        return;
      }

      if (isMounted.current) {
        // Filter out messages in deleted conversations (only those before deletion)
        let count = 0;
        unreadMessages?.forEach(msg => {
          const deletedAt = deletedConvMap.get(msg.conversation_id);
          if (!deletedAt || new Date(msg.created_at) > new Date(deletedAt)) {
            count++;
          }
        });
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error fetching messenger unread count:', error);
    }
  }, [user?.id]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    isMounted.current = true;

    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch with small delay to not block render
    const timer = setTimeout(() => {
      fetchUnreadCount(true);
    }, 300);

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`messenger-unread-global-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_messages',
        },
        async (payload) => {
          if (!isMounted.current) return;
          const msg = payload.new as any;
          
          // Only count messages sent TO us (not by us)
          if (msg.sender_id === user.id) return;
          
          // Check if this message is in one of our conversations
          if (conversationIdsRef.current.length === 0) {
            // If we don't have conversation IDs yet, fetch them
            const { data: convs } = await supabase
              .from('messenger_conversations')
              .select('id')
              .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
            conversationIdsRef.current = convs?.map(c => c.id) || [];
          }
          
          if (conversationIdsRef.current.includes(msg.conversation_id)) {
            // Remove any deletion record for this conversation (user will see it again)
            try {
              await supabase
                .from('messenger_conversation_deletions')
                .delete()
                .eq('conversation_id', msg.conversation_id)
                .eq('user_id', user.id);
            } catch (e) {
              // Ignore
            }
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messenger_messages',
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // If message was marked as read (and it wasn't sent by us)
          if (newData?.read_at && !oldData?.read_at && newData?.sender_id !== user.id) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Backup poll every 30 seconds
    const pollInterval = setInterval(() => {
      if (isMounted.current) {
        fetchUnreadCount();
      }
    }, 30000);

    // Refetch on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        fetchUnreadCount(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for global refresh events (triggered by bulk operations)
    const handleGlobalRefresh = () => {
      if (isMounted.current) {
        fetchUnreadCount(true);
      }
    };
    window.addEventListener(MESSAGES_REFRESH_EVENT, handleGlobalRefresh);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(MESSAGES_REFRESH_EVENT, handleGlobalRefresh);
    };
  }, [user?.id, fetchUnreadCount]);

  return {
    unreadCount,
    refetch: fetchUnreadCount,
  };
}
