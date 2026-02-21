/**
 * Hook for managing messenger conversations with pagination
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getOnlineGracePeriodMinutes, isUserOnlineByLastSeen } from '@/hooks/useOnlineStatus';
import { CHEGE_USER_ID, PIKASO_USER_ID } from '@/utils/rootUtils';
import type { MessengerConversation } from '../types';

const CONVERSATIONS_PER_PAGE = 20;

export function useMessengerConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const offsetRef = useRef(0);

  const fetchConversations = useCallback(async (reset = true) => {
    if (!user?.id) return;
    
    try {
      setError(null);
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }
      
      // Fetch blocked users (both directions)
      const { data: blockedData } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      
      // Create sets for quick lookup
      const blockedByMe = new Set(blockedData?.filter(b => b.blocker_id === user.id).map(b => b.blocked_id) || []);
      const blockedMe = new Set(blockedData?.filter(b => b.blocked_id === user.id).map(b => b.blocker_id) || []);
      
      // Fetch conversations where user is participant with pagination
      const { data: convs, error: convError } = await supabase
        .from('messenger_conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(offsetRef.current, offsetRef.current + CONVERSATIONS_PER_PAGE - 1);
      
      if (convError) throw convError;
      
      // Filter out conversations with blocked users (either direction)
      let filteredConvs = convs?.filter(c => {
        const otherUserId = c.user1_id === user.id ? c.user2_id : c.user1_id;
        return !blockedByMe.has(otherUserId) && !blockedMe.has(otherUserId);
      }) || [];

      // For root admins (CHEGE, PIKASO), keep all conversations visible
      const isChegeUser = user.id === CHEGE_USER_ID;
      const isPikasoUser = user.id === PIKASO_USER_ID;
      const isRootAdmin = isChegeUser || isPikasoUser;
      
      if (!isRootAdmin && filteredConvs.length > 0) {
        const convIds = filteredConvs.map(c => c.id);
        const { data: deletionRecords } = await supabase
          .from('messenger_conversation_deletions')
          .select('conversation_id')
          .eq('user_id', user.id)
          .in('conversation_id', convIds);
        
        const deletedConvIds = new Set(deletionRecords?.map(d => d.conversation_id) || []);
        filteredConvs = filteredConvs.filter(c => !deletedConvIds.has(c.id));
      }

      // For root admins, fetch deletion info to mark deleted conversations
      let conversationDeletionMap = new Map<string, string>(); // convId -> deleted_at
      if (isRootAdmin && filteredConvs.length > 0) {
        const convIds = filteredConvs.map(c => c.id);
        const { data: allDeletions } = await supabase
          .from('messenger_conversation_deletions')
          .select('conversation_id, user_id, deleted_at')
          .in('conversation_id', convIds);
        
        // Track if the OTHER user deleted the conversation
        allDeletions?.forEach(d => {
          if (d.user_id !== user.id) {
            conversationDeletionMap.set(d.conversation_id, d.deleted_at);
          }
        });
      }
      
      if (filteredConvs.length === 0) {
        if (reset) {
          setConversations([]);
        }
        setHasMore(convs && convs.length >= CONVERSATIONS_PER_PAGE);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      
      // Get other user IDs
      const otherUserIds = filteredConvs.map(c => 
        c.user1_id === user.id ? c.user2_id : c.user1_id
      );
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, gender, online_visible_until, last_seen')
        .in('user_id', otherUserIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Count unread messages per conversation
      const { data: unreadData } = await supabase
        .from('messenger_messages')
        .select('conversation_id, id')
        .in('conversation_id', filteredConvs.map(c => c.id))
        .neq('sender_id', user.id)
        .is('read_at', null);
      
      const unreadMap = new Map<string, number>();
      unreadData?.forEach(m => {
        unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
      });
      
      // Get grace period for online status
      const gracePeriodMinutes = await getOnlineGracePeriodMinutes();
      
      // Map conversations with other user data
      const mapped: MessengerConversation[] = filteredConvs.map(conv => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const profile = profilesMap.get(otherUserId);
        
        // Check online status: first try online_visible_until, then fallback to last_seen with grace period
        const checkOnline = (p: typeof profile) => {
          if (!p) return false;
          if (p.online_visible_until && new Date(p.online_visible_until) > new Date()) return true;
          return isUserOnlineByLastSeen(p.last_seen, gracePeriodMinutes);
        };
        
        return {
          ...conv,
          other_user: profile ? {
            user_id: profile.user_id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            gender: profile.gender || undefined,
            is_online: checkOnline(profile),
            last_seen: profile.last_seen,
          } : undefined,
          unread_count: unreadMap.get(conv.id) || 0,
          // For CHEGE: mark if other user deleted this conversation
          is_deleted_by_other: conversationDeletionMap.has(conv.id),
          deleted_by_other_at: conversationDeletionMap.get(conv.id) || undefined,
        };
      });
      
      if (reset) {
        setConversations(mapped);
      } else {
        setConversations(prev => [...prev, ...mapped]);
      }
      
      setHasMore(filteredConvs.length >= CONVERSATIONS_PER_PAGE);
      offsetRef.current += filteredConvs.length;
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  // Load more conversations
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchConversations(false);
    }
  }, [loadingMore, hasMore, fetchConversations]);

  // Get or create conversation with a user
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user?.id) return null;
    
    try {
      // First, check if either user has blocked the other
      const { data: blockData } = await supabase
        .from('user_blocks')
        .select('id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
        .maybeSingle();
      
      if (blockData) {
        console.error('Cannot create conversation: user is blocked');
        return null;
      }
      
      const { data, error } = await supabase
        .rpc('get_or_create_messenger_conversation', { other_user_id: otherUserId });
      
      if (error) throw error;
      
      // Refresh conversations list
      await fetchConversations();
      
      return data;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      return null;
    }
  }, [user?.id, fetchConversations]);

  // Update conversation settings
  const updateConversation = useCallback(async (
    conversationId: string, 
    updates: Partial<Pick<MessengerConversation, 'theme' | 'custom_emoji' | 'user1_nickname' | 'user2_nickname' | 'vanish_mode_enabled'>>
  ) => {
    try {
      const { error } = await supabase
        .from('messenger_conversations')
        .update(updates)
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Update local state
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, ...updates } : c
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error updating conversation:', err);
      return false;
    }
  }, []);

  // Clear unread count for a specific conversation (when opened)
  const clearUnreadCount = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, unread_count: 0 } : c
    ));
  }, []);

  // Delete conversation (soft delete - preserves for inspectors; CHEGE does hard delete for own cleanup)
  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!user?.id) return false;
    const isChegeUser = user.id === CHEGE_USER_ID;
    
    try {
      if (isChegeUser) {
        // CHEGE: hard delete - remove deletion records and the conversation from CHEGE's view completely
        // Delete CHEGE's own deletion record if exists
        await supabase
          .from('messenger_conversation_deletions')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
        
        // Hard delete all messages in this conversation
        await supabase
          .from('messenger_messages')
          .delete()
          .eq('conversation_id', conversationId);
        
        // Delete other deletion records
        await supabase
          .from('messenger_conversation_deletions')
          .delete()
          .eq('conversation_id', conversationId);
        
        // Delete the conversation itself
        await supabase
          .from('messenger_conversations')
          .delete()
          .eq('id', conversationId);
      } else {
        // Regular users: soft delete - preserve content for inspectors
        const { data: existingMessages } = await supabase
          .from('messenger_messages')
          .select('id, content, image_urls, video_url, voice_url, file_url, gif_id')
          .eq('conversation_id', conversationId)
          .eq('is_deleted', false);

        if (existingMessages && existingMessages.length > 0) {
          for (const msg of existingMessages) {
            await supabase
              .from('messenger_messages')
              .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by_user_id: user.id,
                original_content: msg.content,
                original_image_urls: msg.image_urls,
                original_video_url: msg.video_url,
                original_voice_url: msg.voice_url,
                original_file_url: msg.file_url,
                original_gif_id: msg.gif_id,
                content: null,
                image_urls: null,
                video_url: null,
                voice_url: null,
                file_url: null,
                gif_id: null,
              })
              .eq('id', msg.id);
          }
        }

        // Record the conversation deletion
        await supabase
          .from('messenger_conversation_deletions')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            deleted_at: new Date().toISOString(),
          }, { onConflict: 'conversation_id,user_id' });
      }
      
      // Remove from local state immediately
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      return true;
    } catch (err: any) {
      console.error('Error deleting conversation:', err);
      return false;
    }
  }, [user?.id]);

  // Delete all conversations (soft delete - preserves for inspectors)
  const deleteAllConversations = useCallback(async (): Promise<boolean> => {
    if (!user?.id || conversations.length === 0) return false;
    
    try {
      const convIds = conversations.map(c => c.id);
      
      // Soft-delete all messages across all conversations
      for (const convId of convIds) {
        const { data: existingMessages } = await supabase
          .from('messenger_messages')
          .select('id, content, image_urls, video_url, voice_url, file_url, gif_id')
          .eq('conversation_id', convId)
          .eq('is_deleted', false);

        if (existingMessages && existingMessages.length > 0) {
          for (const msg of existingMessages) {
            await supabase
              .from('messenger_messages')
              .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by_user_id: user.id,
                original_content: msg.content,
                original_image_urls: msg.image_urls,
                original_video_url: msg.video_url,
                original_voice_url: msg.voice_url,
                original_file_url: msg.file_url,
                original_gif_id: msg.gif_id,
                content: null,
                image_urls: null,
                video_url: null,
                voice_url: null,
                file_url: null,
                gif_id: null,
              })
              .eq('id', msg.id);
          }
        }
      }
      
      // Record all conversation deletions
      const deletionRecords = convIds.map(convId => ({
        conversation_id: convId,
        user_id: user.id,
        deleted_at: new Date().toISOString(),
      }));
      
      await supabase
        .from('messenger_conversation_deletions')
        .upsert(deletionRecords, { onConflict: 'conversation_id,user_id' });
      
      // Clear local state immediately
      setConversations([]);
      
      return true;
    } catch (err: any) {
      console.error('Error deleting all conversations:', err);
      return false;
    }
  }, [user?.id, conversations]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    
    fetchConversations();
    
    // Subscribe to conversation updates
    subscriptionRef.current = supabase
      .channel(`messenger-convs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messenger_conversations',
        },
        (payload) => {
          const conv = payload.new as any;
          if (conv && (conv.user1_id === user.id || conv.user2_id === user.id)) {
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_messages',
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // If a new message arrives in a conversation we previously deleted,
          // remove the deletion record so the conversation reappears
          if (newMsg?.conversation_id && newMsg?.sender_id !== user.id) {
            try {
              await supabase
                .from('messenger_conversation_deletions')
                .delete()
                .eq('conversation_id', newMsg.conversation_id)
                .eq('user_id', user.id);
            } catch (e) {
              // Ignore - deletion record may not exist
            }
          }
          
          // Refresh to update last_message_preview and unread counts
          fetchConversations();
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
          // When messages are marked as read, update unread counts
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.read_at && !oldData?.read_at) {
            // Message was marked as read - refetch to update counts
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_blocks',
        },
        (payload) => {
          // When blocks change, refresh to filter out blocked conversations
          const block = (payload.new || payload.old) as any;
          if (block && (block.blocker_id === user.id || block.blocked_id === user.id)) {
            fetchConversations();
          }
        }
      )
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, fetchConversations]);

  return {
    conversations,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchConversations,
    loadMore,
    getOrCreateConversation,
    updateConversation,
    clearUnreadCount,
    deleteConversation,
    deleteAllConversations,
  };
}
