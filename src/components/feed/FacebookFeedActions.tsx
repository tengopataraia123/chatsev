import React, { useState, useRef, useEffect, useCallback, forwardRef, memo } from 'react';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

interface FacebookFeedActionsProps {
  itemId: string;
  itemType: 'post' | 'activity' | 'poll' | 'video' | 'photo' | 'forum' | 'group_post';
  ownerId: string;
  onCommentClick: () => void;
  onShareClick: () => void;
  showShare?: boolean;
  commentsCount?: number;
}

const FacebookFeedActions = memo(forwardRef<HTMLDivElement, FacebookFeedActionsProps>(({
  itemId,
  itemType,
  ownerId,
  onCommentClick,
  onShareClick,
  showShare = true,
  commentsCount = 0
}, ref) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reactionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Fetch reactions once on mount, no realtime needed
  useEffect(() => {
    if (user && !itemId.startsWith('group-')) {
      supabase
        .from('message_reactions')
        .select('reaction_type')
        .eq('message_id', itemId)
        .eq('message_type', itemType)
        .eq('user_id', user.id)
        .then(({ data }) => {
          setMyReactions(data?.map(r => r.reaction_type) || []);
        });
    }
  }, [itemId, itemType, user?.id]);

  const handleReaction = async (reactionType: string) => {
    if (!user || loading) return;
    // Skip for group posts - they use a different ID format
    if (itemId.startsWith('group-')) {
      console.log('[FacebookFeedActions] Skipping reaction for group post');
      return;
    }
    setLoading(true);
    setShowReactionPicker(false);
    setHoveredReaction(null);

    try {
      const hasThisReaction = myReactions.includes(reactionType);

      if (hasThisReaction) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('message_id', itemId)
          .eq('message_type', itemType)
          .eq('reaction_type', reactionType);
        setMyReactions(prev => prev.filter(r => r !== reactionType));
      } else {
        // Remove existing reactions first (single reaction per item)
        if (myReactions.length > 0) {
          await supabase
            .from('message_reactions')
            .delete()
            .eq('user_id', user.id)
            .eq('message_id', itemId)
            .eq('message_type', itemType);
        }
        
        await supabase.from('message_reactions').insert({
          user_id: user.id,
          message_id: itemId,
          message_type: itemType,
          reaction_type: reactionType
        });
        setMyReactions([reactionType]);

        // Send notification
        if (ownerId && ownerId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: ownerId,
            from_user_id: user.id,
            type: `${itemType}_reaction`,
            post_id: itemId,
            message: reactionType
          });
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLike = () => {
    if (!showReactionPicker) {
      if (myReactions.length > 0) {
        handleReaction(myReactions[0]);
      } else {
        handleReaction('like');
      }
    }
  };

  // Long press for mobile
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
    <div ref={ref} className="relative flex items-center border-t border-border">
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
            "w-full flex items-center justify-center gap-2 py-2.5 transition-colors",
            "hover:bg-secondary/50 touch-manipulation",
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
                  className="bg-card border border-border rounded-full shadow-2xl p-1.5 flex gap-0.5"
                  style={{
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
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

      {/* Comment Button */}
      <button
        onClick={onCommentClick}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-muted-foreground hover:bg-secondary/50 transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm">კომენტარი{commentsCount > 0 ? ` ${commentsCount}` : ''}</span>
      </button>

      {/* Share Button */}
      {showShare && (
        <button
          onClick={onShareClick}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm">გაზიარება</span>
        </button>
      )}
    </div>
  );
}));

FacebookFeedActions.displayName = 'FacebookFeedActions';

export default FacebookFeedActions;
