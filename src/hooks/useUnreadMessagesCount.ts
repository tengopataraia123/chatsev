import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUnreadMessagesCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);
  const conversationIdsRef = useRef<string[]>([]);

  const fetchUnreadCount = useCallback(async (force = false) => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Debounce - don't fetch more than once per 500ms unless forced
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 500) return;
    lastFetchTime.current = now;

    try {
      // Get all conversations where user is participant
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return;
      }

      if (!conversations || conversations.length === 0) {
        if (isMounted.current) setUnreadCount(0);
        return;
      }

      const conversationIds = conversations.map(c => c.id);
      conversationIdsRef.current = conversationIds;

      // Get user's conversation states (for cleared_at timestamps)
      const { data: states } = await supabase
        .from('conversation_user_state')
        .select('conversation_id, cleared_at, is_deleted')
        .eq('user_id', user.id)
        .in('conversation_id', conversationIds);

      const deletedConvIds = new Set<string>();
      const clearedAtMap = new Map<string, string>();
      
      states?.forEach(state => {
        if (state.is_deleted) {
          deletedConvIds.add(state.conversation_id);
        }
        if (state.cleared_at) {
          clearedAtMap.set(state.conversation_id, state.cleared_at);
        }
      });

      // Filter out deleted conversations
      const activeConvIds = conversationIds.filter(id => !deletedConvIds.has(id));
      
      if (activeConvIds.length === 0) {
        if (isMounted.current) setUnreadCount(0);
        return;
      }

      // Get all unread messages (NOT sent by current user)
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('private_messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', activeConvIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (unreadError) {
        console.error('Error fetching unread messages:', unreadError);
        return;
      }

      // Filter out messages before cleared_at
      let totalUnread = 0;
      unreadMessages?.forEach(msg => {
        const clearedAt = clearedAtMap.get(msg.conversation_id);
        if (!clearedAt || new Date(msg.created_at) > new Date(clearedAt)) {
          totalUnread++;
        }
      });

      if (isMounted.current) {
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  // Deferred initial fetch - don't block initial page render
  useEffect(() => {
    isMounted.current = true;
    
    // Defer the first fetch to not block critical path
    const timer = setTimeout(() => {
      fetchUnreadCount(true);
    }, 500);
    
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [fetchUnreadCount]);

  // Subscribe to real-time message changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`unread-messages-global-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
        async (payload) => {
          if (!isMounted.current) return;
          const msg = payload.new as any;
          
          // Only count messages sent TO us (not by us)
          if (msg.sender_id === user.id) return;
          
          // Check if this message is in one of our conversations
          if (conversationIdsRef.current.length === 0) {
            const { data: conversations } = await supabase
              .from('conversations')
              .select('id')
              .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
            conversationIdsRef.current = conversations?.map(c => c.id) || [];
          }
          
          if (conversationIdsRef.current.includes(msg.conversation_id)) {
            // Un-delete conversation if it was previously deleted by user
            try {
              await supabase
                .from('conversation_user_state')
                .update({ is_deleted: false })
                .eq('conversation_id', msg.conversation_id)
                .eq('user_id', user.id)
                .eq('is_deleted', true);
            } catch (e) {
              // Ignore - state may not exist
            }
            // Optimistically increment
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // If message was marked as read (and it wasn't sent by us)
          if (newData?.is_read === true && oldData?.is_read === false && newData?.sender_id !== user.id) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          if (!isMounted.current) return;
          const oldData = payload.old as any;
          // If deleted message was unread and not from us
          if (oldData?.is_read === false && oldData?.sender_id !== user.id) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Backup poll every 30 seconds for reliability
    const pollInterval = setInterval(() => {
      if (isMounted.current) {
        fetchUnreadCount();
      }
    }, 30000);

    // Refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        fetchUnreadCount(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchUnreadCount]);

  return { unreadCount, refetch: fetchUnreadCount };
};

export default useUnreadMessagesCount;
