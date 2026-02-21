/**
 * Hook for managing messenger messages
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CHEGE_USER_ID } from '@/utils/rootUtils';
import type { MessengerMessage, MessengerReaction } from '../types';
import { EDIT_TIME_LIMIT_MINUTES, DELETE_TIME_LIMIT_MINUTES } from '../types';
import { firePush } from '@/utils/firePush';

const MESSAGES_PER_PAGE = 30;

export function useMessengerMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const offsetRef = useRef(0);
  const markingAsReadRef = useRef(false);

  const fetchMessages = useCallback(async (reset = true) => {
    if (!conversationId || !user?.id) return;
    
    try {
      if (reset) {
        offsetRef.current = 0;
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('messenger_messages')
        .select(`
          *,
          reactions:messenger_reactions(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + MESSAGES_PER_PAGE - 1);
      
      if (error) throw error;
      
      // Fetch sender profiles
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, gender')
        .in('user_id', senderIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Fetch reply_to messages if any
      const replyIds = data?.filter(m => m.reply_to_id).map(m => m.reply_to_id) || [];
      let repliesMap = new Map<string, MessengerMessage>();
      
      if (replyIds.length > 0) {
        const { data: replies } = await supabase
          .from('messenger_messages')
          .select('*')
          .in('id', replyIds);
        
        replies?.forEach(r => {
          const profile = profilesMap.get(r.sender_id);
          repliesMap.set(r.id, {
            ...r,
            sender: profile ? {
              username: profile.username,
              avatar_url: profile.avatar_url,
              gender: profile.gender || undefined,
            } : undefined,
          } as MessengerMessage);
        });
      }
      
      // Fetch GIF data if any
      const gifIds = data?.filter(m => m.gif_id).map(m => m.gif_id) || [];
      let gifsMap = new Map<string, any>();
      
      if (gifIds.length > 0) {
        const { data: gifs } = await supabase
          .from('gifs')
          .select('id, gif_url, shortcode')
          .in('id', gifIds);
        
        gifs?.forEach((g: any) => gifsMap.set(g.id, { id: g.id, url: g.gif_url, shortcode: g.shortcode }));
      }
      
      // Map messages with all data
      const isChegeUser = user.id === CHEGE_USER_ID;
      const mapped: MessengerMessage[] = (data || []).map((msg: any) => {
        const profile = profilesMap.get(msg.sender_id);
        
        // For CHEGE: restore original content for deleted messages
        const effectiveContent = (isChegeUser && msg.is_deleted && msg.original_content) 
          ? msg.original_content : msg.content;
        const effectiveImageUrls = (isChegeUser && msg.is_deleted && msg.original_image_urls) 
          ? msg.original_image_urls : msg.image_urls;
        const effectiveVideoUrl = (isChegeUser && msg.is_deleted && msg.original_video_url) 
          ? msg.original_video_url : msg.video_url;
        const effectiveVoiceUrl = (isChegeUser && msg.is_deleted && msg.original_voice_url) 
          ? msg.original_voice_url : msg.voice_url;
        const effectiveGifId = (isChegeUser && msg.is_deleted && msg.original_gif_id) 
          ? msg.original_gif_id : msg.gif_id;
        
        return {
          ...msg,
          content: effectiveContent,
          image_urls: effectiveImageUrls,
          video_url: effectiveVideoUrl,
          voice_url: effectiveVoiceUrl,
          gif_id: effectiveGifId,
          metadata: typeof msg.metadata === 'object' ? msg.metadata : {},
          sender: profile ? {
            username: profile.username,
            avatar_url: profile.avatar_url,
            gender: profile.gender || undefined,
          } : undefined,
          reply_to: msg.reply_to_id ? repliesMap.get(msg.reply_to_id) : null,
          gif: effectiveGifId ? gifsMap.get(effectiveGifId) : null,
          reactions: msg.reactions || [],
        } as MessengerMessage;
      });
      
      // Reverse to show oldest first in UI
      const orderedMessages = mapped.reverse();
      
      if (reset) {
        setMessages(orderedMessages);
      } else {
        setMessages(prev => [...orderedMessages, ...prev]);
      }
      
      setHasMore((data?.length || 0) >= MESSAGES_PER_PAGE);
      offsetRef.current += data?.length || 0;
      
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  // Explicitly mark all unread messages as read - returns true on success
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !user?.id) return false;
    
    // Prevent duplicate marking
    if (markingAsReadRef.current) return false;
    markingAsReadRef.current = true;
    
    try {
      // First check if there are any unread messages to mark
      const { data: unreadMessages, error: checkError } = await supabase
        .from('messenger_messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);
      
      if (checkError) {
        console.error('Error checking unread messages:', checkError);
        return false;
      }
      
      // If no unread messages, return success
      if (!unreadMessages || unreadMessages.length === 0) {
        return true;
      }
      
      const unreadIds = unreadMessages.map(m => m.id);
      
      // Mark them as read
      const { error } = await supabase
        .from('messenger_messages')
        .update({ 
          read_at: new Date().toISOString(), 
          status: 'read' 
        })
        .in('id', unreadIds);
      
      if (error) {
        console.error('Error marking messages as read:', error);
        return false;
      }
      
      console.log(`Marked ${unreadIds.length} messages as read in conversation ${conversationId}`);
      return true;
    } catch (err) {
      console.error('Error in markAllAsRead:', err);
      return false;
    } finally {
      markingAsReadRef.current = false;
    }
  }, [conversationId, user?.id]);

  // Load more (older) messages
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(false);
    }
  }, [loading, hasMore, fetchMessages]);

  // Send a new message
  const sendMessage = useCallback(async (params: {
    content?: string;
    image_urls?: string[];
    video_url?: string;
    voice_url?: string;
    voice_duration_seconds?: number;
    file_url?: string;
    file_name?: string;
    file_size_bytes?: number;
    gif_id?: string;
    gif_url?: string; // Pass GIF URL for optimistic update
    reply_to_id?: string;
  }) => {
    if (!conversationId || !user?.id) return null;
    
    try {
      setSending(true);
      
      // First, check if either user has blocked the other
      const { data: conv } = await supabase
        .from('messenger_conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single();
      
      if (conv) {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        
        // Check for blocks in either direction
        const { data: blockData } = await supabase
          .from('user_blocks')
          .select('id')
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
          .maybeSingle();
        
        if (blockData) {
          console.error('Cannot send message: user is blocked');
          return null;
        }
      }
      
      // Extract gif_url for optimistic update (don't send to DB)
      const { gif_url, ...dbParams } = params;
      
      const { data, error } = await supabase
        .from('messenger_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          ...dbParams,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to local state immediately (optimistic) with GIF data
      const newMessage: MessengerMessage = {
        ...data,
        metadata: typeof data.metadata === 'object' ? data.metadata : {},
        sender: {
          username: user.user_metadata?.username || 'მე',
          avatar_url: user.user_metadata?.avatar_url || null,
        },
        reactions: [],
        // Include GIF data for immediate display
        gif: params.gif_id && gif_url ? {
          id: params.gif_id,
          url: gif_url,
          shortcode: '',
        } : null,
      } as MessengerMessage;
      
      setMessages(prev => [...prev, newMessage]);
      
      // Send push notification to the other user
      if (conv) {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const senderName = user.user_metadata?.username || 'მომხმარებელი';
        const cleanContent = (params.content || '').replace(/\[GIF:https?:\/\/[^\]]+\]/g, '🎬').trim();
        const pushBody = params.gif_id ? '🎬 GIF' : params.voice_url ? '🎤 ხმოვანი შეტყობინება' : params.image_urls?.length ? '📷 ფოტო' : params.video_url ? '🎥 ვიდეო' : params.file_url ? '📎 ფაილი' : cleanContent;
        firePush({
          targetUserId: otherUserId,
          title: senderName,
          body: (pushBody || 'ახალი შეტყობინება').substring(0, 100),
          fromUserId: user.id,
          data: { route: '/messenger' },
        });
      }
      
      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      return null;
    } finally {
      setSending(false);
    }
  }, [conversationId, user?.id]);

  // Edit a message (within 15 minutes)
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.sender_id !== user?.id) return false;
    
    // Check time limit
    const createdAt = new Date(message.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    if (diffMinutes > EDIT_TIME_LIMIT_MINUTES) {
      console.error(`Cannot edit message after ${EDIT_TIME_LIMIT_MINUTES} minutes`);
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('messenger_messages')
        .update({ 
          content: newContent, 
          is_edited: true, 
          edited_at: new Date().toISOString() 
        })
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, content: newContent, is_edited: true, edited_at: new Date().toISOString() }
          : m
      ));
      
      return true;
    } catch (err) {
      console.error('Error editing message:', err);
      return false;
    }
  }, [messages, user?.id]);

  // Delete a message (within 10 minutes for everyone, or anytime for self)
  const deleteMessage = useCallback(async (messageId: string, forEveryone: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return false;
    
    // For "delete for everyone", only sender can do it within time limit
    if (forEveryone) {
      if (message.sender_id !== user?.id) {
        console.error('Cannot delete other user\'s message for everyone');
        return false;
      }
      
      const createdAt = new Date(message.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      if (diffMinutes > DELETE_TIME_LIMIT_MINUTES) {
        console.error(`Cannot delete for everyone after ${DELETE_TIME_LIMIT_MINUTES} minutes`);
        return false;
      }
    }
    
    try {
      if (forEveryone) {
        // Soft delete - preserve original content, then null active fields
        const { error } = await supabase
          .from('messenger_messages')
          .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString(),
            deleted_for_everyone: true,
            deleted_by_user_id: user?.id,
            // Preserve originals
            original_content: message.content,
            original_image_urls: message.image_urls,
            original_video_url: message.video_url,
            original_voice_url: message.voice_url,
            original_file_url: message.file_url,
            original_gif_id: message.gif_id,
            // Null active fields
            content: null,
            image_urls: null,
            video_url: null,
            voice_url: null,
            file_url: null,
            gif_id: null,
          })
          .eq('id', messageId);
        
        if (error) throw error;
        
        // Update local state
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, is_deleted: true, deleted_for_everyone: true, content: null }
            : m
        ));
      } else {
        // Soft delete for self - mark as deleted with preserved content
        const { error } = await supabase
          .from('messenger_messages')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by_user_id: user?.id,
            // Preserve originals
            original_content: message.content || undefined,
            original_image_urls: message.image_urls || undefined,
            original_video_url: message.video_url || undefined,
            original_voice_url: message.voice_url || undefined,
            original_file_url: message.file_url || undefined,
            original_gif_id: message.gif_id || undefined,
          })
          .eq('id', messageId);
        
        if (error) throw error;
        
        // Remove from local view for regular users
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      return false;
    }
  }, [messages, user?.id]);

  // Add reaction to message with notification
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return false;
    
    // Find the message to get its owner
    const message = messages.find(m => m.id === messageId);
    
    try {
      const { error } = await supabase
        .from('messenger_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        }, {
          onConflict: 'message_id,user_id',
        });
      
      if (error) throw error;
      
      // Send notification to message owner (if not self)
      if (message && message.sender_id !== user.id) {
        const contentPreview = message.content?.substring(0, 50) || 'შეტყობინება';
        await supabase.from('notifications').insert({
          user_id: message.sender_id,
          from_user_id: user.id,
          type: 'reaction',
          message: `${messageId}|${emoji}|${contentPreview}`,
          related_id: messageId,
          related_type: 'messenger_message'
        });
      }
      
      // Update local state
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        
        const existingReaction = m.reactions?.find(r => r.user_id === user.id);
        if (existingReaction) {
          return {
            ...m,
            reactions: m.reactions?.map(r => 
              r.user_id === user.id ? { ...r, emoji } : r
            ),
          };
        } else {
          return {
            ...m,
            reactions: [...(m.reactions || []), { 
              id: crypto.randomUUID(), 
              message_id: messageId, 
              user_id: user.id, 
              emoji, 
              created_at: new Date().toISOString() 
            }],
          };
        }
      }));
      
      return true;
    } catch (err) {
      console.error('Error adding reaction:', err);
      return false;
    }
  }, [user?.id, messages]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId: string) => {
    if (!user?.id) return false;
    
    try {
      const { error } = await supabase
        .from('messenger_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, reactions: m.reactions?.filter(r => r.user_id !== user.id) }
          : m
      ));
      
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      return false;
    }
  }, [user?.id]);

  // Delete all messages in conversation (soft delete - preserves for inspectors)
  const deleteAllMessages = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !user?.id) return false;
    
    try {
      // First, get all non-deleted messages to preserve their content
      const { data: existingMessages } = await supabase
        .from('messenger_messages')
        .select('id, content, image_urls, video_url, voice_url, file_url, gif_id')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false);

      if (existingMessages && existingMessages.length > 0) {
        // Batch update: preserve originals and soft-delete
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
      
      // Clear local state
      setMessages([]);
      
      return true;
    } catch (err) {
      console.error('Error deleting all messages:', err);
      return false;
    }
  }, [conversationId, user?.id]);

  // Delete entire conversation
  const deleteConversation = useCallback(async (forEveryone: boolean): Promise<boolean> => {
    if (!conversationId || !user?.id) return false;
    
    try {
      // Get all non-deleted messages to preserve content
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
              deleted_for_everyone: forEveryone,
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
      
      // Clear local state
      setMessages([]);
      
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      return false;
    }
  }, [conversationId, user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    
    fetchMessages();
    
    subscriptionRef.current = supabase
      .channel(`messenger-msgs-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id === user.id) return; // Skip own messages (already added optimistically)
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url, gender')
            .eq('user_id', newMsg.sender_id)
            .single();
          
          const fullMsg: MessengerMessage = {
            ...newMsg,
            sender: profile ? {
              username: profile.username,
              avatar_url: profile.avatar_url,
              gender: profile.gender || undefined,
            } : undefined,
            reactions: [],
          };
          
          setMessages(prev => [...prev, fullMsg]);
          
          // Mark as delivered
          await supabase
            .from('messenger_messages')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .eq('id', newMsg.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messenger_messages',
          filter: `conversation_id=eq.${conversationId}`,
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
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_reactions',
        },
        (payload) => {
          const newReaction = payload.new as any;
          // Only update if reaction is for a message in this conversation
          setMessages(prev => prev.map(m => {
            if (m.id !== newReaction.message_id) return m;
            // Avoid duplicates
            const exists = m.reactions?.some(r => r.id === newReaction.id);
            if (exists) return m;
            return {
              ...m,
              reactions: [...(m.reactions || []), newReaction],
            };
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messenger_reactions',
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages(prev => prev.map(m => {
            if (m.id !== updated.message_id) return m;
            return {
              ...m,
              reactions: m.reactions?.map(r => r.id === updated.id ? { ...r, ...updated } : r),
            };
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messenger_reactions',
        },
        (payload) => {
          const deleted = payload.old as any;
          setMessages(prev => prev.map(m => {
            if (m.id !== deleted.message_id) return m;
            return {
              ...m,
              reactions: m.reactions?.filter(r => r.id !== deleted.id),
            };
          }));
        }
      )
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [conversationId, user?.id, fetchMessages]);

  return {
    messages,
    loading,
    hasMore,
    sending,
    fetchMessages,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAllAsRead,
    deleteAllMessages,
    deleteConversation,
  };
}
