import { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Send, MessageCircle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FB_REACTIONS, getStoryReactionEmoji } from './types';

interface StoryBottomBarProps {
  isOwner: boolean;
  viewsCount: number;
  reactionsCount: number;
  commentsCount: number;
  userReaction: string | null;
  reactionCounts: Record<string, number>;
  onViewsClick: () => void;
  onReactionsClick: () => void;
  onCommentsClick: () => void;
  onReaction: (type: string) => void;
  onComment: (text: string) => void;
  disabled?: boolean;
}

// Default 3 reactions shown initially
const DEFAULT_REACTIONS = FB_REACTIONS.filter(r => 
  r.type === 'love' || r.type === 'like' || r.type === 'haha'
);

const StoryBottomBar = memo(function StoryBottomBar({
  isOwner,
  viewsCount,
  reactionsCount,
  commentsCount,
  userReaction,
  reactionCounts,
  onViewsClick,
  onReactionsClick,
  onCommentsClick,
  onReaction,
  onComment,
  disabled
}: StoryBottomBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [flyingEmoji, setFlyingEmoji] = useState<{ emoji: string; id: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  const handleSelectReaction = useCallback((type: string) => {
    const isRemoving = userReaction === type;
    if (isRemoving) {
      onReaction('');
    } else {
      onReaction(type);
      // Trigger fly-up animation
      const emoji = FB_REACTIONS.find(r => r.type === type)?.emoji || '👍';
      setFlyingEmoji({ emoji, id: Date.now() });
    }
    setExpanded(false);
    setHoveredReaction(null);
  }, [userReaction, onReaction]);

  const handleSubmitComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onComment(trimmed);
      setCommentText('');
    } finally {
      setSending(false);
    }
  }, [commentText, sending, onComment]);

  // Swipe detection on the reaction area
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    // Swipe left to expand, swipe right to collapse
    if (deltaX < -30 && !expanded) {
      setExpanded(true);
    } else if (deltaX > 30 && expanded) {
      setExpanded(false);
    }
  }, [expanded]);

  // Get top 3 reactions for owner display
  const topReactions = Object.entries(reactionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const reactionsToShow = expanded ? FB_REACTIONS : DEFAULT_REACTIONS;

  return (
    <div className="absolute bottom-0 inset-x-0 z-20">
      {/* Flying emoji animation */}
      <AnimatePresence>
        {flyingEmoji && (
          <motion.div
            key={flyingEmoji.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -120, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            onAnimationComplete={() => setFlyingEmoji(null)}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <span className="text-5xl">{flyingEmoji.emoji}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Bottom Bar */}
      <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-6 px-4">
        <div className="flex items-center gap-2">
          {/* LEFT: Views count - only visible to owner */}
          {isOwner && (
            <button
              onClick={onViewsClick}
              className="flex items-center gap-1.5 text-white/90 hover:text-white active:scale-95 transition-colors"
            >
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">{viewsCount}</span>
            </button>
          )}

          {/* Non-owner: Comment input + reactions */}
          {!isOwner ? (
            <>
              {/* Comment input - collapses when reactions expanded */}
              <AnimatePresence mode="wait">
                {!expanded && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex items-center gap-2 overflow-hidden"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                  >
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="შეტყობინების გაგ..."
                      className="flex-1 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm rounded-full"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                      disabled={disabled || sending}
                      maxLength={500}
                    />
                    {commentText.trim() && (
                      <Button
                        onClick={handleSubmitComment}
                        disabled={!commentText.trim() || sending || disabled}
                        size="icon"
                        variant="ghost"
                        className="shrink-0 h-9 w-9 text-white hover:bg-white/20"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reactions row */}
              <motion.div
                ref={containerRef}
                className="flex items-center gap-1 shrink-0"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleTouchStart(e);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  handleTouchEnd(e);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                layout
              >
                {/* Expand/collapse button */}
                {expanded && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    onClick={() => setExpanded(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </motion.button>
                )}

                <AnimatePresence mode="popLayout">
                  {reactionsToShow.map((reaction, index) => {
                    const isActive = userReaction === reaction.type;
                    const isHovered = hoveredReaction === reaction.type;
                    
                    return (
                      <motion.button
                        key={reaction.type}
                        layout
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: 1, 
                          scale: isHovered ? 1.5 : 1,
                          y: isHovered ? -16 : 0
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 500, 
                          damping: 25,
                          delay: expanded ? index * 0.02 : 0
                        }}
                        onClick={() => handleSelectReaction(reaction.type)}
                        onMouseEnter={() => setHoveredReaction(reaction.type)}
                        onMouseLeave={() => setHoveredReaction(null)}
                        disabled={disabled}
                        className={cn(
                          "relative flex items-center justify-center w-10 h-10 rounded-full transition-all touch-manipulation",
                          isActive && "bg-white/20 ring-2 ring-white/40"
                        )}
                      >
                        <span className="text-[28px] select-none leading-none">{reaction.emoji}</span>
                        
                        {/* Label tooltip on hover */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.span
                              initial={{ opacity: 0, y: 4, scale: 0.7 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.7 }}
                              className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-black/90 text-white px-2 py-0.5 rounded-full whitespace-nowrap"
                            >
                              {reaction.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>

                {/* Expand trigger - shown when collapsed */}
                {!expanded && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setExpanded(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                )}
              </motion.div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-4">
              {topReactions.length > 0 && (
                <button
                  onClick={onReactionsClick}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <div className="flex -space-x-1">
                    {topReactions.map(([type]) => (
                      <span key={type} className="text-lg">{getStoryReactionEmoji(type)}</span>
                    ))}
                  </div>
                  <span className="text-white/70 text-sm ml-1">{reactionsCount}</span>
                </button>
              )}
              <button
                onClick={onCommentsClick}
                className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">{commentsCount}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default StoryBottomBar;
