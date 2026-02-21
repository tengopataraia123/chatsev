import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { triggerNotificationRefresh } from '@/utils/notificationEvents';

export interface SystemMessageDelivery {
  id: string;
  message_id: string;
  user_id: string;
  pinned: boolean;
  opened_at: string | null;
  deleted_at: string | null;
  created_at: string;
  message: {
    id: string;
    title: string | null;
    body: string;
    attachments: AttachmentMeta[];
    allow_user_delete: boolean;
    created_at: string;
    sent_at: string | null;
  };
}

interface AttachmentMeta {
  url: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  size: number;
}

export const useSystemMessages = () => {
  const { user } = useAuth();
  const [pinnedMessages, setPinnedMessages] = useState<SystemMessageDelivery[]>([]);
  const [allMessages, setAllMessages] = useState<SystemMessageDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) {
      setPinnedMessages([]);
      setAllMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('system_message_deliveries')
        .select(`
          id,
          message_id,
          user_id,
          pinned,
          opened_at,
          deleted_at,
          created_at,
          message:system_messages!system_message_deliveries_message_id_fkey (
            id,
            title,
            body,
            attachments,
            allow_user_delete,
            created_at,
            sent_at
          )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validMessages = (data || [])
        .filter(d => d.message !== null)
        .map(d => ({
          id: d.id,
          message_id: d.message_id,
          user_id: d.user_id,
          pinned: d.pinned,
          opened_at: d.opened_at,
          deleted_at: d.deleted_at,
          created_at: d.created_at,
          message: {
            id: d.message!.id,
            title: d.message!.title,
            body: d.message!.body,
            attachments: (d.message!.attachments as unknown as AttachmentMeta[]) || [],
            allow_user_delete: d.message!.allow_user_delete,
            created_at: d.message!.created_at,
            sent_at: d.message!.sent_at,
          }
        })) as SystemMessageDelivery[];

      setPinnedMessages(validMessages.filter(m => m.pinned));
      setAllMessages(validMessages);
      setUnreadCount(validMessages.filter(m => !m.opened_at).length);
    } catch (error) {
      console.error('Error fetching system messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to new deliveries
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('system-message-deliveries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_message_deliveries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchMessages]);

  const markAsOpened = useCallback(async (deliveryId: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase.rpc('open_system_message', {
        p_delivery_id: deliveryId
      });

      if (error) throw error;

      // Update local state
      setPinnedMessages(prev => prev.filter(m => m.id !== deliveryId));
      setAllMessages(prev => 
        prev.map(m => 
          m.id === deliveryId 
            ? { ...m, pinned: false, opened_at: new Date().toISOString() }
            : m
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Trigger global notification refresh for bell badge
      triggerNotificationRefresh();

      return true;
    } catch (error) {
      console.error('Error marking message as opened:', error);
      return false;
    }
  }, [user?.id]);

  const deleteMessage = useCallback(async (deliveryId: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase.rpc('delete_system_message_for_user', {
        p_delivery_id: deliveryId
      });

      if (error) throw error;

      // Update local state
      setPinnedMessages(prev => prev.filter(m => m.id !== deliveryId));
      setAllMessages(prev => prev.filter(m => m.id !== deliveryId));
      
      // Trigger global notification refresh for bell badge
      triggerNotificationRefresh();

      return true;
    } catch (error) {
      console.error('Error deleting system message:', error);
      return false;
    }
  }, [user?.id]);

  return {
    pinnedMessages,
    allMessages,
    loading,
    unreadCount,
    markAsOpened,
    deleteMessage,
    refresh: fetchMessages,
  };
};

export default useSystemMessages;
