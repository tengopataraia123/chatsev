import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ReactionsModal from './ReactionsModal';

// Facebook-style reactions
export const UNIVERSAL_REACTIONS = [
  { type: 'like', emoji: '👍', label: 'მოწონება', color: '#2078F4' },
  { type: 'love', emoji: '❤️', label: 'სიყვარული', color: '#F33E58' },
  { type: 'care', emoji: '🤗', label: 'ზრუნვა', color: '#F7B125' },
  { type: 'haha', emoji: '😂', label: 'ჰაჰა', color: '#F7B125' },
  { type: 'wow', emoji: '😮', label: 'ვაუ', color: '#F7B125' },
  { type: 'sad', emoji: '😢', label: 'სევდა', color: '#F7B125' },
  { type: 'angry', emoji: '😡', label: 'ბრაზი', color: '#E9710F' },
] as const;

export type ReactionType = typeof UNIVERSAL_REACTIONS[number]['type'];

export interface ReactionCounts {
  [key: string]: number;
}

export interface UniversalReactionButtonProps {
  targetType: 'story' | 'message' | 'comment' | 'post' | 'room_message' | 'private_message' | 'reply';
  targetId: string;
  contentOwnerId?: string;
  contentPreview?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  labelText?: string;
  className?: string;
  onReactionChange?: (reaction: string | null, counts: ReactionCounts) => void;
  onUserClick?: (userId: string) => void;
}

// Long press duration in ms
const LONG_PRESS_DURATION = 350;

export const getReactionEmoji = (type: string) => {
  return UNIVERSAL_REACTIONS.find(r => r.type === type)?.emoji || '👍';
};

export const getReactionLabel = (type: string) => {
  return UNIVERSAL_REACTIONS.find(r => r.type === type)?.label || 'მოწონება';
};

export const getReactionColor = (type: string) => {
  return UNIVERSAL_REACTIONS.find(r => r.type === type)?.color || '#2078F4';
};

const UniversalReactionButton = memo(function UniversalReactionButton({
  targetType,
  targetId,
  contentOwnerId,
  contentPreview,
  size = 'md',
  showLabel = true,
  labelText = 'Like',
  className,
  onReactionChange,
  onUserClick,
}: UniversalReactionButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [showPicker, setShowPicker] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const reactionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Fetch current reactions on mount
  useEffect(() => {
    if (!targetId) return;
    
    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from('universal_reactions')
        .select('reaction_type, user_id')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) {
        console.error('Error fetching reactions:', error);
        return;
      }

      // Count reactions
      const counts: ReactionCounts = {};
      let userReaction: string | null = null;
      
      data?.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        if (user?.id && r.user_id === user.id) {
          userReaction = r.reaction_type;
        }
      });

      setReactionCounts(counts);
      setMyReaction(userReaction);
    };

    fetchReactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`reactions-${targetType}-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'universal_reactions',
          filter: `target_id=eq.${targetId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, targetType, user?.id]);

  // Handle reaction selection
  const handleReaction = useCallback(async (reactionType: string) => {
    if (!user?.id || loading) return;

    setLoading(true);
    const previousReaction = myReaction;
    const previousCounts = { ...reactionCounts };

    try {
      // Optimistic update
      if (myReaction === reactionType) {
        // Remove reaction (toggle off)
        setMyReaction(null);
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
        }));

        await supabase
          .from('universal_reactions')
          .delete()
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .eq('user_id', user.id);
      } else {
        // Add or change reaction
        const newCounts = { ...reactionCounts };
        if (myReaction) {
          newCounts[myReaction] = Math.max(0, (newCounts[myReaction] || 0) - 1);
        }
        newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
        
        setMyReaction(reactionType);
        setReactionCounts(newCounts);

        await supabase
          .from('universal_reactions')
          .upsert({
            target_type: targetType,
            target_id: targetId,
            user_id: user.id,
            reaction_type: reactionType,
          }, {
            onConflict: 'target_type,target_id,user_id',
          });

        // Send notification if not own content
        if (contentOwnerId && contentOwnerId !== user.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .single();

          const emoji = getReactionEmoji(reactionType);
          const typeLabel = targetType === 'story' ? 'სთორიზე' 
            : targetType === 'post' ? 'პოსტზე'
            : targetType === 'comment' ? 'კომენტარზე'
            : 'შეტყობინებაზე';

          await supabase
            .from('notifications')
            .insert({
              user_id: contentOwnerId,
              from_user_id: user.id,
              type: `${targetType}_reaction`,
              message: `${profile?.username || 'მომხმარებელმა'} ${emoji} რეაქცია დატოვა შენს ${typeLabel}`,
              related_id: targetId,
              is_read: false,
            });
        }
      }

      onReactionChange?.(myReaction === reactionType ? null : reactionType, reactionCounts);
    } catch (error) {
      console.error('Error updating reaction:', error);
      // Rollback on error
      setMyReaction(previousReaction);
      setReactionCounts(previousCounts);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
      setShowPicker(false);
      setHoveredReaction(null);
    }
  }, [user?.id, myReaction, reactionCounts, targetType, targetId, contentOwnerId, loading, onReactionChange, toast]);

  // Short click handler - toggle like
  const handleShortClick = useCallback(() => {
    if (isLongPress.current) return;
    handleReaction('like');
  }, [handleReaction]);

  // Long press handlers
  const handlePressStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowPicker(true);
    }, LONG_PRESS_DURATION);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Touch drag to select reaction
  const findReactionAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    for (const [type, element] of reactionRefs.current.entries()) {
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left - 10 && clientX <= rect.right + 10 && 
          clientY >= rect.top - 30 && clientY <= rect.bottom + 10) {
        return type;
      }
    }
    return null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!showPicker) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const reactionType = findReactionAtPoint(touch.clientX, touch.clientY);
    if (reactionType !== hoveredReaction) {
      setHoveredReaction(reactionType);
    }
  }, [showPicker, findReactionAtPoint, hoveredReaction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!showPicker) return;
    e.stopPropagation();
    e.preventDefault();
    if (hoveredReaction) {
      handleReaction(hoveredReaction);
    } else {
      setShowPicker(false);
    }
  }, [showPicker, hoveredReaction, handleReaction]);

  // Keyboard support
  useEffect(() => {
    if (!showPicker) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPicker(false);
        setHoveredReaction(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPicker]);

  // Animation presets for each reaction
  const getReactionAnimation = (type: string, isHovered: boolean) => {
    const baseScale = isHovered ? 1.6 : 1;
    const baseY = isHovered ? -20 : 0;
    
    const animations: Record<string, object> = {
      like: { rotate: [0, -15, 15, -10, 0], scale: [baseScale, baseScale * 1.1, baseScale] },
      love: { scale: [baseScale, baseScale * 1.2, baseScale * 0.9, baseScale * 1.1, baseScale] },
      haha: { rotate: [0, -12, 12, -12, 12, 0], y: [baseY, baseY - 6, baseY, baseY - 4, baseY] },
      wow: { scale: [baseScale, baseScale * 1.3, baseScale * 0.85, baseScale], y: [baseY, baseY - 10, baseY] },
      sad: { y: [baseY, baseY + 4, baseY, baseY + 2, baseY], rotate: [0, -6, 6, 0] },
      angry: { rotate: [0, -8, 8, -8, 8, -4, 4, 0], scale: [baseScale, baseScale * 1.1, baseScale] },
      care: { scale: [baseScale, baseScale * 1.1, baseScale * 0.92, baseScale], rotate: [0, 6, -6, 0] },
    };

    return { scale: baseScale, y: baseY, ...animations[type] };
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topReactions = Object.entries(reactionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  };

  const emojiSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const pickerEmojiSizes = {
    sm: 'text-2xl',
    md: 'text-[28px]',
    lg: 'text-[32px]',
  };

  return (
    <div className={cn("relative inline-flex items-center", sizeClasses[size], className)}>
      {/* Main Like Button */}
      <motion.button
        ref={buttonRef}
        onMouseDown={handlePressStart}
        onMouseUp={() => {
          handlePressEnd();
          handleShortClick();
        }}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={(e) => {
          handlePressEnd();
          if (!isLongPress.current) {
            handleShortClick();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPicker(true);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={loading || !user}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all touch-manipulation select-none",
          "hover:bg-secondary/50 active:bg-secondary/70",
          myReaction && "font-semibold",
          loading && "opacity-50 cursor-not-allowed"
        )}
        style={{ color: myReaction ? getReactionColor(myReaction) : undefined }}
        aria-label={myReaction ? `${getReactionLabel(myReaction)} - ხანგრძლივად დააჭირე რეაქციების სანახავად` : 'Like - ხანგრძლივად დააჭირე რეაქციების სანახავად'}
      >
        {/* Always show emoji - either user's reaction or default like icon */}
        <motion.span 
          className={emojiSizes[size]}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          {myReaction ? getReactionEmoji(myReaction) : '👍'}
        </motion.span>
        {showLabel && (
          <span className={cn(
            "font-medium",
            !myReaction && "text-muted-foreground"
          )}>
            {labelText}
          </span>
        )}
      </motion.button>

      {/* Reaction counts badge - clickable to show users */}
      {totalReactions > 0 && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setShowUsersModal(true)}
          className="flex items-center gap-0.5 ml-1 hover:opacity-80 transition-opacity"
        >
          {topReactions.map(([type]) => (
            <span key={type} className={cn(emojiSizes[size], "leading-none")}>
              {getReactionEmoji(type)}
            </span>
          ))}
          <span className="text-muted-foreground ml-0.5">{totalReactions}</span>
        </motion.button>
      )}

      {/* Reaction Picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div 
            key="reaction-picker-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div 
              className="fixed inset-0 z-[150]"
              onClick={() => {
                setShowPicker(false);
                setHoveredReaction(null);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            {/* Picker Panel */}
            <motion.div
              className="fixed z-[200]"
              initial={{ opacity: 0, scale: 0.3, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.3, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                left: buttonRef.current 
                  ? Math.max(12, Math.min(
                      buttonRef.current.getBoundingClientRect().left - 60,
                      window.innerWidth - 340
                    ))
                  : '50%',
                bottom: buttonRef.current 
                  ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 12 
                  : 'auto',
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <motion.div 
                className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl p-2 flex gap-1"
                style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
              >
                {UNIVERSAL_REACTIONS.map((reaction, index) => (
                  <motion.button
                    key={reaction.type}
                    ref={(el) => {
                      if (el) reactionRefs.current.set(reaction.type, el);
                    }}
                    initial={{ opacity: 0, y: 25, scale: 0 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      delay: index * 0.03,
                      type: 'spring',
                      stiffness: 500,
                      damping: 15
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReaction(reaction.type);
                    }}
                    onMouseEnter={() => setHoveredReaction(reaction.type)}
                    onMouseLeave={() => setHoveredReaction(null)}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setHoveredReaction(reaction.type);
                    }}
                    className={cn(
                      "relative touch-manipulation rounded-full p-1 transition-colors",
                      myReaction === reaction.type && "bg-primary/20 ring-2 ring-primary/40"
                    )}
                    aria-label={reaction.label}
                  >
                    <motion.span 
                      className={cn(pickerEmojiSizes[size], "block leading-none select-none cursor-pointer")}
                      animate={getReactionAnimation(reaction.type, hoveredReaction === reaction.type)}
                      transition={{
                        duration: 0.45,
                        repeat: hoveredReaction === reaction.type ? Infinity : 0,
                        repeatType: 'loop',
                        ease: 'easeInOut',
                      }}
                      style={{
                        filter: hoveredReaction === reaction.type 
                          ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.4))' 
                          : 'none',
                        transformOrigin: 'center bottom',
                      }}
                    >
                      {reaction.emoji}
                    </motion.span>
                    
                    {/* Floating label */}
                    <AnimatePresence>
                      {hoveredReaction === reaction.type && (
                        <motion.span
                          initial={{ opacity: 0, y: 8, scale: 0.7 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.7 }}
                          transition={{ duration: 0.1, type: 'spring', stiffness: 500 }}
                          className="absolute -top-9 left-1/2 -translate-x-1/2 text-xs font-semibold bg-black/90 text-white px-2 py-1 rounded-full shadow-xl whitespace-nowrap"
                        >
                          {reaction.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users who reacted modal */}
      <AnimatePresence>
        {showUsersModal && (
          <ReactionsModal
            messageId={targetId}
            messageType={targetType}
            onClose={() => setShowUsersModal(false)}
            onUserClick={(userId) => {
              setShowUsersModal(false);
              onUserClick?.(userId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default UniversalReactionButton;
