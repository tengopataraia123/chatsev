import { useState, useEffect, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import ReactionPicker, { getReactionEmoji, REACTION_TYPES } from './ReactionPicker';
import ReactionsModal from './ReactionsModal';
import { cn } from '@/lib/utils';

interface ReactionCount {
  reaction_type: string;
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  messageType: 'group_chat' | 'private' | 'comment' | 'reply' | 'post';
  messageOwnerId?: string;
  messageContent?: string; // For notification display
  roomType?: string; // For group chat notifications - which room (gossip, night, emigrants, dj)
  roomName?: string; // Display name for the room
  size?: 'sm' | 'md';
  onUserClick?: (userId: string) => void;
  showLabel?: boolean;
  labelText?: string;
}

const MessageReactions = forwardRef<HTMLDivElement, MessageReactionsProps>(({ messageId, messageType, messageOwnerId, messageContent, roomType, roomName, size = 'md', onUserClick, showLabel = false, labelText = 'Like' }, ref) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [myReactions, setMyReactions] = useState<string[]>([]); // Changed to array for multiple reactions
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchReactions();
    
    // Skip realtime for group posts - they use a different ID format
    if (messageId.startsWith('group-')) return;
    
    // Subscribe to realtime updates for ALL reaction changes on this message
    const channel = supabase
      .channel(`reactions-${messageType}-${messageId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          fetchReactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          fetchReactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, messageType]);

  const fetchReactions = async () => {
    // Skip for group posts - they use a different ID format
    if (messageId.startsWith('group-')) {
      setReactions([]);
      setMyReactions([]);
      return;
    }
    
    // Fetch all reactions for this message
    const { data, error } = await supabase
      .from('message_reactions')
      .select('reaction_type, user_id')
      .eq('message_id', messageId)
      .eq('message_type', messageType);

    if (error) {
      console.error('Error fetching reactions:', error);
      return;
    }

    // Count reactions by type
    const counts = new Map<string, number>();
    const userReactions: string[] = [];
    
    data?.forEach(r => {
      counts.set(r.reaction_type, (counts.get(r.reaction_type) || 0) + 1);
      if (user && r.user_id === user.id) {
        userReactions.push(r.reaction_type);
      }
    });

    setMyReactions(userReactions);

    const reactionCounts: ReactionCount[] = [];
    counts.forEach((count, type) => {
      reactionCounts.push({ reaction_type: type, count });
    });
    
    setReactions(reactionCounts.sort((a, b) => b.count - a.count));
  };

  const handleReaction = async (reactionType: string) => {
    if (!user || loading) return;
    // Skip for group posts - they use a different ID format
    if (messageId.startsWith('group-')) {
      console.log('[MessageReactions] Skipping reaction for group post');
      return;
    }
    setLoading(true);

    try {
      const hasThisReaction = myReactions.includes(reactionType);
      
      if (hasThisReaction) {
        // Remove this specific reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('message_id', messageId)
          .eq('message_type', messageType)
          .eq('reaction_type', reactionType);
        
        setMyReactions(prev => prev.filter(r => r !== reactionType));
      } else {
        // Add new reaction (allow multiple reactions per user)
        await supabase
          .from('message_reactions')
          .insert({
            user_id: user.id,
            message_id: messageId,
            message_type: messageType,
            reaction_type: reactionType
          });
        
        setMyReactions(prev => [...prev, reactionType]);
        
        // Send notification if reacting to someone else's message
        if (messageOwnerId && messageOwnerId !== user.id) {
          const notificationType = messageType === 'group_chat' ? 'group_chat_reaction' 
            : messageType === 'post' ? 'post_reaction' 
            : 'reaction';
          
          // Format: messageId|reactionType|messageContent for better navigation and display
          const contentForNotification = messageContent || 'შეტყობინება';
          const notificationMessage = `${messageId}|${reactionType}|${contentForNotification}`;
          
          await supabase.from('notifications').insert({
            user_id: messageOwnerId,
            from_user_id: user.id,
            type: notificationType,
            post_id: messageId,
            message: notificationMessage,
            content: roomName || null, // Room name for display
            related_type: roomType || null // Room type for navigation
          });
        }
      }
      
      fetchReactions();
    } catch (error) {
      console.error('Error handling reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  // Check if user has any reaction
  const hasAnyReaction = myReactions.length > 0;
  const primaryReaction = myReactions[0];

  return (
    <>
      <div ref={ref} className={cn(
        "flex items-center", 
        size === 'sm' ? 'text-xs' : 'text-sm',
        showLabel ? 'gap-2' : 'gap-1'
      )}>
      {showLabel ? (
          // Facebook-style button with label - text only via ReactionPicker
          <ReactionPicker 
            onSelect={handleReaction} 
            currentReactions={myReactions}
            size={size}
            labelText={labelText}
          />
        ) : (
          <ReactionPicker 
            onSelect={handleReaction} 
            currentReactions={myReactions}
            size={size}
          />
        )}
        
        <AnimatePresence mode="popLayout">
          {reactions.length > 0 && !showLabel && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="flex items-center gap-0.5 bg-secondary/50 hover:bg-secondary rounded-full px-1.5 py-0.5 transition-colors"
            >
              {reactions.slice(0, 3).map((r, index) => (
                <motion.span 
                  key={r.reaction_type} 
                  className={size === 'sm' ? 'text-sm' : 'text-base'}
                  initial={{ scale: 0, x: -5 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {getReactionEmoji(r.reaction_type)}
                </motion.span>
              ))}
              {totalReactions > 0 && (
                <motion.span 
                  className="text-muted-foreground ml-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {totalReactions}
                </motion.span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Show reaction count for label mode - only 1 emoji + count */}
        {showLabel && reactions.length > 0 && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-0.5 hover:underline whitespace-nowrap"
          >
            <span className="text-sm">
              {getReactionEmoji(reactions[0].reaction_type)}
            </span>
            <span className="text-xs text-muted-foreground">
              {totalReactions}
            </span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <ReactionsModal
            messageId={messageId}
            messageType={messageType}
            onClose={() => setShowModal(false)}
            onUserClick={onUserClick}
          />
        )}
      </AnimatePresence>
    </>
  );
});

MessageReactions.displayName = 'MessageReactions';

export default MessageReactions;