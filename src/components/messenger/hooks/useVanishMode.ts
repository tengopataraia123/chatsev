/**
 * Hook for managing Vanish Mode in conversations
 */
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VanishModeOptions {
  conversationId: string;
  isEnabled: boolean;
  timeoutHours: number;
}

export function useVanishMode({ conversationId, isEnabled, timeoutHours }: VanishModeOptions) {
  const { user } = useAuth();
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mark message as vanishing when read
  const markMessageForVanishing = useCallback(async (messageId: string) => {
    if (!isEnabled) return;
    
    const vanishesAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from('messenger_messages')
      .update({
        is_vanishing: true,
        vanishes_at: vanishesAt,
      })
      .eq('id', messageId)
      .neq('sender_id', user?.id); // Only vanish messages from others
  }, [isEnabled, timeoutHours, user?.id]);

  // Cleanup expired vanishing messages
  const cleanupExpiredMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      // Delete messages that have passed their vanish time
      await supabase
        .from('messenger_messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('is_vanishing', true)
        .lt('vanishes_at', new Date().toISOString());
    } catch (err) {
      console.error('Error cleaning up vanishing messages:', err);
    }
  }, [conversationId]);

  // Set up cleanup interval when vanish mode is enabled
  useEffect(() => {
    if (!isEnabled || !conversationId) {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
      return;
    }

    // Run cleanup immediately and then every minute
    cleanupExpiredMessages();
    cleanupIntervalRef.current = setInterval(cleanupExpiredMessages, 60000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [isEnabled, conversationId, cleanupExpiredMessages]);

  // Toggle vanish mode for conversation
  const toggleVanishMode = useCallback(async (enable: boolean, hours: number = 24) => {
    try {
      const { error } = await supabase
        .from('messenger_conversations')
        .update({
          vanish_mode_enabled: enable,
          vanish_mode_timeout_hours: hours,
        })
        .eq('id', conversationId);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error toggling vanish mode:', err);
      return false;
    }
  }, [conversationId]);

  return {
    markMessageForVanishing,
    toggleVanishMode,
    cleanupExpiredMessages,
  };
}
