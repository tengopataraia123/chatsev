/**
 * Hook for managing typing indicators
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const TYPING_TIMEOUT = 3000; // 3 seconds

export function useMessengerTyping(conversationId: string | null) {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [otherTypingUser, setOtherTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Set current user as typing
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !user?.id) return;
    
    try {
      await supabase
        .from('messenger_typing')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id,user_id',
        });
    } catch (err) {
      console.error('Error setting typing status:', err);
    }
  }, [conversationId, user?.id]);

  // Start typing (with auto-stop after timeout)
  const startTyping = useCallback(() => {
    setTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after timeout
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, TYPING_TIMEOUT);
  }, [setTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Subscribe to typing status
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    
    // Fetch initial typing status
    const fetchTyping = async () => {
      const { data } = await supabase
        .from('messenger_typing')
        .select('user_id, is_typing')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .eq('is_typing', true)
        .single();
      
      if (data) {
        setIsOtherTyping(true);
        setOtherTypingUser(data.user_id);
      }
    };
    
    fetchTyping();
    
    // Subscribe to changes
    subscriptionRef.current = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messenger_typing',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data && data.user_id !== user.id) {
            setIsOtherTyping(data.is_typing);
            setOtherTypingUser(data.is_typing ? data.user_id : null);
          }
        }
      )
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clear typing status when leaving
      setTyping(false);
    };
  }, [conversationId, user?.id, setTyping]);

  return {
    isOtherTyping,
    otherTypingUser,
    startTyping,
    stopTyping,
  };
}
