import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import FloatingEmoji from './FloatingEmoji';
import { firePush } from '@/utils/firePush';

// Facebook-style reactions with Georgian names
const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'მოწონება', color: '#2078F4' },
  { type: 'love', emoji: '❤️', label: 'სიყვარული', color: '#F33E58' },
  { type: 'care', emoji: '🤗', label: 'ზრუნვა', color: '#F7B125' },
  { type: 'haha', emoji: '😂', label: 'ჰაჰა', color: '#F7B125' },
  { type: 'wow', emoji: '😮', label: 'ვაუ', color: '#F7B125' },
  { type: 'sad', emoji: '😢', label: 'სევდა', color: '#F7B125' },
  { type: 'angry', emoji: '😡', label: 'ბრაზი', color: '#E9710F' },
];

export const getReactionEmoji = (type: string) => {
  return REACTIONS.find(r => r.type === type)?.emoji || '👍';
};

export const REACTION_TYPES = REACTIONS;

interface FacebookActionButtonsProps {
  postId: string;
  postOwnerId: string;
  onCommentClick: () => void;
  onShareClick: () => void;
  commentsCount?: number;
}

const FacebookActionButtons = ({
  postId,
  postOwnerId,
  onCommentClick,
  onShareClick,
  commentsCount = 0
}: FacebookActionButtonsProps) => {
  const { user } = useAuth();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reactionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    fetchMyReactions();
  }, [postId, user?.id]);

  const fetchMyReactions = async () => {
    if (!user) return;
    // Skip for group posts - they use a different ID format
    if (postId.startsWith('group-')) return;
    
    const { data } = await supabase
      .from('message_reactions')
      .select('reaction_type')
      .eq('message_id', postId)
      .eq('message_type', 'post')
      .eq('user_id', user.id);

    setMyReactions(data?.map(r => r.reaction_type) || []);
  };

  const handleReaction = async (reactionType: string) => {
    if (!user || loading) return;
    // Skip for group posts
    if (postId.startsWith('group-')) {
      console.log('[FacebookActionButtons] Skipping reaction for group post');
      return;
    }
    setLoading(true);
    setShowReactionPicker(false);
    setHoveredReaction(null);

    // Optimistic update
    const prevReactions = [...myReactions];

    try {
      // First, always delete any existing reactions for this user on this post
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('message_id', postId)
        .eq('message_type', 'post');

      if (deleteError) {
        console.error('Error deleting reaction:', deleteError);
      }

      // Check if user is toggling off the same reaction
      const wasToggleOff = prevReactions.includes(reactionType);

      if (wasToggleOff) {
        // Just remove - already deleted above
        setMyReactions([]);
      } else {
        // Add new reaction
        setMyReactions([reactionType]);
        // Trigger floating emoji animation
        const reactionEmoji = REACTIONS.find(r => r.type === reactionType)?.emoji;
        if (reactionEmoji) setFloatingEmoji(reactionEmoji);
        
        const { error: insertError } = await supabase.from('message_reactions').insert({
          user_id: user.id,
          message_id: postId,
          message_type: 'post',
          reaction_type: reactionType
        });

        if (insertError) {
          console.error('Error inserting reaction:', insertError);
          // Rollback on error
          setMyReactions(prevReactions);
          return;
        }

        // Send notification (only for new reactions, not updates)
        if (postOwnerId && postOwnerId !== user.id && prevReactions.length === 0) {
          await supabase.from('notifications').insert({
            user_id: postOwnerId,
            from_user_id: user.id,
            type: 'post_reaction',
            post_id: postId,
            message: reactionType
          });
          // Push notification
          firePush({ targetUserId: postOwnerId, type: 'post_reaction', fromUserId: user.id });
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      // Rollback on error
      setMyReactions(prevReactions);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLike = () => {
    // Only toggle if not showing reaction picker
    if (!showReactionPicker) {
      if (myReactions.length > 0) {
        handleReaction(myReactions[0]);
      } else {
        handleReaction('like');
      }
    }
  };

  // Long press handlers for mobile
  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 400);
  }, []);

  const handleTouchEndButton = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Find which reaction is under touch point
  const findReactionAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    for (const [type, element] of reactionRefs.current.entries()) {
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && 
          clientY >= rect.top - 30 && clientY <= rect.bottom + 10) {
        return type;
      }
    }
    return null;
  }, []);

  // Handle touch move - slide finger across reactions
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const reactionType = findReactionAtPoint(touch.clientX, touch.clientY);
    if (reactionType && reactionType !== hoveredReaction) {
      setHoveredReaction(reactionType);
    }
  }, [findReactionAtPoint, hoveredReaction]);

  // Handle touch end - select the hovered reaction
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hoveredReaction) {
      handleReaction(hoveredReaction);
    } else {
      setShowReactionPicker(false);
    }
  }, [hoveredReaction]);

  // FB-style continuous animation for each reaction type
  const getReactionAnimation = (type: string, isHovered: boolean) => {
    const baseScale = isHovered ? 1.7 : 1;
    const baseY = isHovered ? -25 : 0;
    
    const animations: Record<string, any> = {
      like: {
        rotate: [0, -20, 20, -15, 0],
        scale: [baseScale, baseScale * 1.15, baseScale],
      },
      love: {
        scale: [baseScale, baseScale * 1.25, baseScale * 0.9, baseScale * 1.15, baseScale],
      },
      haha: {
        rotate: [0, -15, 15, -15, 15, 0],
        y: [baseY, baseY - 8, baseY, baseY - 5, baseY],
      },
      wow: {
        scale: [baseScale, baseScale * 1.35, baseScale * 0.85, baseScale],
        y: [baseY, baseY - 12, baseY],
      },
      sad: {
        y: [baseY, baseY + 5, baseY, baseY + 3, baseY],
        rotate: [0, -8, 8, 0],
      },
      angry: {
        rotate: [0, -10, 10, -10, 10, -6, 6, 0],
        scale: [baseScale, baseScale * 1.15, baseScale],
      },
      care: {
        scale: [baseScale, baseScale * 1.15, baseScale * 0.92, baseScale],
        rotate: [0, 8, -8, 0],
      },
    };

    return {
      scale: baseScale,
      y: baseY,
      ...animations[type],
    };
  };

  const primaryReaction = myReactions[0];
  const reactionInfo = primaryReaction
    ? REACTIONS.find(r => r.type === primaryReaction)
    : null;

  return (
    <div className="relative flex items-center border-t border-border/30 mx-2 pt-0.5">
      {/* Like Button */}
      <div className="flex-1 relative">
        <button
          ref={buttonRef}
          onClick={handleQuickLike}
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEndButton}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-200",
            "hover:bg-secondary/60 active:scale-[0.97] touch-manipulation",
            primaryReaction && "font-semibold"
          )}
          style={{ color: reactionInfo?.color }}
        >
          {primaryReaction ? (
            <span className="text-lg">{getReactionEmoji(primaryReaction)}</span>
          ) : (
            <ThumbsUp className="w-5 h-5 text-muted-foreground" />
          )}
          <span className={cn(
            "text-sm",
            !primaryReaction && "text-muted-foreground"
          )}>
            {primaryReaction ? reactionInfo?.label : 'მოწონება'}
          </span>
        </button>

        {/* Reaction Picker */}
        <AnimatePresence>
          {showReactionPicker && (
            <>
              {/* Backdrop for mobile */}
              <div 
                className="fixed inset-0 z-40 md:hidden"
                onClick={() => setShowReactionPicker(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute bottom-full left-0 mb-2 z-50"
                onMouseEnter={() => setShowReactionPicker(true)}
                onMouseLeave={() => setShowReactionPicker(false)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <motion.div 
                  className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-full shadow-2xl p-1.5 flex gap-0.5"
                  style={{
                    boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {REACTIONS.map((reaction, index) => (
                    <motion.button
                      key={reaction.type}
                      ref={(el) => {
                        if (el) reactionRefs.current.set(reaction.type, el);
                      }}
                      initial={{ scale: 0, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: index * 0.03, type: 'spring', stiffness: 500 }}
                      onClick={() => handleReaction(reaction.type)}
                      onMouseEnter={() => setHoveredReaction(reaction.type)}
                      onMouseLeave={() => setHoveredReaction(null)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setHoveredReaction(reaction.type);
                      }}
                      className={cn(
                        "relative touch-manipulation rounded-full p-0.5",
                        myReactions.includes(reaction.type) && "bg-primary/20 ring-2 ring-primary/50"
                      )}
                    >
                      <motion.span 
                        className="block text-[28px] leading-none select-none cursor-pointer"
                        animate={getReactionAnimation(reaction.type, hoveredReaction === reaction.type)}
                        transition={{
                          duration: 0.5,
                          repeat: hoveredReaction === reaction.type ? Infinity : 0,
                          repeatType: "loop",
                          ease: "easeInOut",
                        }}
                        style={{
                          filter: hoveredReaction === reaction.type 
                            ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))' 
                            : 'none',
                          transformOrigin: 'center bottom',
                        }}
                      >
                        {reaction.emoji}
                      </motion.span>
                      
                      {/* Floating label - Georgian name */}
                      <AnimatePresence>
                        {hoveredReaction === reaction.type && (
                          <motion.span
                            initial={{ opacity: 0, y: 8, scale: 0.7 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.7 }}
                            transition={{ duration: 0.12, type: "spring", stiffness: 500 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs font-semibold bg-black/90 text-white px-2.5 py-1 rounded-full shadow-xl whitespace-nowrap"
                          >
                            {reaction.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border/40" />

      {/* Comment Button */}
      <button
        onClick={onCommentClick}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-muted-foreground rounded-lg hover:bg-secondary/60 active:scale-[0.97] transition-all duration-200"
      >
        <MessageCircle className="w-[18px] h-[18px]" />
        <span className="text-[13px]">კომენტარი{commentsCount > 0 ? ` ${commentsCount}` : ''}</span>
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-border/40" />

      {/* Share Button */}
      <button
        onClick={onShareClick}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-muted-foreground rounded-lg hover:bg-secondary/60 active:scale-[0.97] transition-all duration-200"
      >
        <Share2 className="w-[18px] h-[18px]" />
        <span className="text-[13px]">გაზიარება</span>
      </button>

      {/* Floating Emoji Animation */}
      {floatingEmoji && createPortal(
        <FloatingEmoji 
          emoji={floatingEmoji} 
          onComplete={() => setFloatingEmoji(null)} 
        />,
        document.body
      )}
    </div>
  );
};

export default FacebookActionButtons;
