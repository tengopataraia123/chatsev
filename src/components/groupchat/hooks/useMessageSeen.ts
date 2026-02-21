import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SeenUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  seen_at: string;
}

interface MessageSeenData {
  [messageId: string]: SeenUser[];
}

export const useMessageSeen = (userId: string | undefined, messageIds: string[]) => {
  const [seenData, setSeenData] = useState<MessageSeenData>({});
  const [loading, setLoading] = useState(false);
  const markedMessagesRef = useRef<Set<string>>(new Set());
  const lastFetchedIdsRef = useRef<string>('');
  
  // Stable string representation of messageIds to prevent infinite loops
  const messageIdsKey = useMemo(() => messageIds.join(','), [messageIds]);
  
  // Fetch seen data for messages
  const fetchSeenData = useCallback(async () => {
    if (!userId || messageIds.length === 0) return;
    
    // Prevent refetching same data
    if (lastFetchedIdsRef.current === messageIdsKey) return;
    lastFetchedIdsRef.current = messageIdsKey;
    
    setLoading(true);
    try {
      console.log('Fetching seen data for', messageIds.length, 'messages');
      
      const { data, error } = await supabase
        .from('group_chat_message_reads')
        .select('message_id, user_id, seen_at')
        .in('message_id', messageIds);
      
      if (error) throw error;
      
      console.log('Got seen data:', data?.length || 0, 'records');
      
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map(d => d.user_id))];
        
        // Fetch user profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        // Group by message_id
        const grouped: MessageSeenData = {};
        data.forEach(item => {
          const profile = profileMap.get(item.user_id);
          if (profile) {
            if (!grouped[item.message_id]) {
              grouped[item.message_id] = [];
            }
            grouped[item.message_id].push({
              user_id: item.user_id,
              username: profile.username,
              avatar_url: profile.avatar_url,
              seen_at: item.seen_at
            });
          }
        });
        
        // Sort by seen_at descending (most recent first)
        Object.keys(grouped).forEach(msgId => {
          grouped[msgId].sort((a, b) => 
            new Date(b.seen_at).getTime() - new Date(a.seen_at).getTime()
          );
        });
        
        console.log('Processed seen data for', Object.keys(grouped).length, 'messages');
        setSeenData(grouped);
      } else {
        setSeenData({});
      }
    } catch (error) {
      console.error('Error fetching seen data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, messageIdsKey, messageIds]);
  
  // Mark messages as seen (batch)
  const markMessagesAsSeen = useCallback(async (visibleMessageIds: string[]) => {
    if (!userId || visibleMessageIds.length === 0) return;
    
    // Filter out already marked messages
    const newMessages = visibleMessageIds.filter(id => !markedMessagesRef.current.has(id));
    if (newMessages.length === 0) return;
    
    try {
      // Prepare records for upsert
      const records = newMessages.map(messageId => ({
        message_id: messageId,
        user_id: userId,
        seen_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('group_chat_message_reads')
        .upsert(records, { 
          onConflict: 'message_id,user_id',
          ignoreDuplicates: true 
        });
      
      if (error) {
        // Handle unique constraint gracefully
        if (!error.message.includes('duplicate')) {
          console.error('Error marking messages as seen:', error);
        }
      } else {
        // Add to marked set
        newMessages.forEach(id => markedMessagesRef.current.add(id));
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  }, [userId]);
  
  // Get seen users for a specific message (excluding sender)
  const getSeenUsers = useCallback((messageId: string, senderId: string): SeenUser[] => {
    const users = seenData[messageId] || [];
    return users.filter(u => u.user_id !== senderId);
  }, [seenData]);
  
  // Initial fetch when messages change
  useEffect(() => {
    if (userId && messageIds.length > 0) {
      fetchSeenData();
    }
  }, [userId, messageIdsKey, fetchSeenData]);
  
  // Set up realtime subscription for seen updates
  useEffect(() => {
    if (!userId || messageIds.length === 0) return;
    
    const channel = supabase
      .channel('group-chat-message-reads-' + userId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_message_reads'
        },
        async (payload) => {
          const newRead = payload.new as any;
          
          // Only process if it's for one of our messages
          if (!messageIds.includes(newRead.message_id)) return;
          
          // Fetch the user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .eq('user_id', newRead.user_id)
            .single();
          
          if (profile) {
            setSeenData(prev => {
              const existing = prev[newRead.message_id] || [];
              // Check if user already in list
              if (existing.some(u => u.user_id === profile.user_id)) {
                return prev;
              }
              
              return {
                ...prev,
                [newRead.message_id]: [
                  {
                    user_id: profile.user_id,
                    username: profile.username,
                    avatar_url: profile.avatar_url,
                    seen_at: newRead.seen_at
                  },
                  ...existing
                ]
              };
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, messageIdsKey, messageIds]);
  
  return {
    seenData,
    loading,
    getSeenUsers,
    markMessagesAsSeen,
    refetch: fetchSeenData
  };
};
