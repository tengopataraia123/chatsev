/**
 * Hook for managing messenger group messages
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MessengerGroupMessage } from '../types';

export function useMessengerGroupMessages(groupId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessengerGroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const LIMIT = 50;

  const fetchMessages = useCallback(async (before?: string) => {
    if (!groupId || !user?.id) return;
    
    try {
      let query = supabase
        .from('messenger_group_messages')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      
      if (before) {
        query = query.lt('created_at', before);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, gender')
        .in('user_id', senderIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const fetchedMessages: MessengerGroupMessage[] = (data || []).reverse().map(m => ({
        ...m,
        metadata: (m.metadata as Record<string, any>) || {},
        sender: profileMap.get(m.sender_id) ? {
          username: profileMap.get(m.sender_id)!.username,
          avatar_url: profileMap.get(m.sender_id)!.avatar_url,
          gender: profileMap.get(m.sender_id)!.gender || undefined,
        } : undefined,
      }));
      
      if (before) {
        setMessages(prev => [...fetchedMessages, ...prev]);
      } else {
        setMessages(fetchedMessages);
      }
      
      setHasMore((data?.length || 0) >= LIMIT);
      
      // Update read status
      await supabase
        .from('messenger_group_reads')
        .upsert({
          group_id: groupId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        }, { onConflict: 'group_id,user_id' });
      
    } catch (err: any) {
      console.error('Error fetching group messages:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id]);

  // Send message
  const sendMessage = useCallback(async (params: {
    content?: string;
    image_urls?: string[];
    video_url?: string;
    voice_url?: string;
    voice_duration_seconds?: number;
    gif_id?: string;
    reply_to_id?: string;
  }) => {
    if (!groupId || !user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('messenger_group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: params.content || null,
          image_urls: params.image_urls || null,
          video_url: params.video_url || null,
          voice_url: params.voice_url || null,
          voice_duration_seconds: params.voice_duration_seconds || null,
          gif_id: params.gif_id || null,
          reply_to_id: params.reply_to_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update group's last message
      await supabase
        .from('messenger_groups')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: params.content?.slice(0, 100) || (params.image_urls ? '📷 ფოტო' : params.voice_url ? '🎤 ხმოვანი' : '📎 მედია'),
          last_message_sender_id: user.id,
        })
        .eq('id', groupId);
      
      return data;
    } catch (err: any) {
      console.error('Error sending group message:', err);
      throw err;
    }
  }, [groupId, user?.id]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('messenger_group_messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', user?.id);
      
      if (error) throw error;
      
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, content, is_edited: true, edited_at: new Date().toISOString() } 
          : m
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error editing message:', err);
      return false;
    }
  }, [user?.id]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messenger_group_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', user?.id);
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      return true;
    } catch (err: any) {
      console.error('Error deleting message:', err);
      return false;
    }
  }, [user?.id]);

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return false;
    
    try {
      // Check if already reacted with same emoji
      const { data: existing } = await supabase
        .from('messenger_group_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();
      
      if (existing) {
        // Remove reaction
        await supabase
          .from('messenger_group_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add reaction
        await supabase
          .from('messenger_group_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          });
      }
      
      // Refresh messages to get updated reactions
      await fetchMessages();
      return true;
    } catch (err: any) {
      console.error('Error adding reaction:', err);
      return false;
    }
  }, [user?.id, fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!groupId || !user?.id) return;
    
    setMessages([]);
    setLoading(true);
    fetchMessages();
    
    subscriptionRef.current = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, avatar_url, gender')
            .eq('user_id', newMsg.sender_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, sender }]);
          
          // Mark as read if from other user
          if (newMsg.sender_id !== user.id) {
            await supabase
              .from('messenger_group_reads')
              .upsert({
                group_id: groupId,
                user_id: user.id,
                last_read_at: new Date().toISOString(),
              }, { onConflict: 'group_id,user_id' });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messenger_group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages(prev => prev.map(m => 
            m.id === updated.id ? { ...m, ...updated } : m
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messenger_group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          setMessages(prev => prev.filter(m => m.id !== deleted.id));
        }
      )
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [groupId, user?.id]);

  return {
    messages,
    loading,
    hasMore,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    loadMore: () => {
      if (messages.length > 0) {
        fetchMessages(messages[0].created_at);
      }
    },
  };
}
