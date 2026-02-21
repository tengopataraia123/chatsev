import { useState, forwardRef, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

interface ReactionPickerProps {
  onSelect: (reactionType: string) => void;
  currentReaction?: string | null;
  currentReactions?: string[];
  size?: 'sm' | 'md';
  labelText?: string;
}

const ReactionPicker = forwardRef<HTMLDivElement, ReactionPickerProps>(
  ({ onSelect, currentReaction, currentReactions = [], size = 'md', labelText }, ref) => {
    const [showPicker, setShowPicker] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const reactionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const activeReactions = currentReactions.length > 0 
      ? currentReactions 
      : (currentReaction ? [currentReaction] : []);

    const handleButtonClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowPicker(prev => !prev);
    };

    const handleSelect = (type: string) => {
      onSelect(type);
      setShowPicker(false);
      setHoveredReaction(null);
    };

    const displayColor = activeReactions.length > 0 
      ? REACTIONS.find(r => r.type === activeReactions[0])?.color 
      : undefined;

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
        handleSelect(hoveredReaction);
      } else {
        setShowPicker(false);
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

    return (
      <div className="relative inline-block" ref={ref}>
        <motion.button
          ref={buttonRef}
          onClick={handleButtonClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex items-center gap-1 hover:bg-secondary/50 rounded-lg transition-all touch-manipulation",
            size === 'sm' ? 'p-1.5 text-sm' : 'py-2 px-1',
            activeReactions.length > 0 && "font-semibold"
          )}
        >
          <span className={cn(
            "font-semibold whitespace-nowrap",
            size === 'sm' ? 'text-xs' : 'text-sm',
            activeReactions.length > 0 ? '' : 'text-muted-foreground'
          )}>
            {labelText || 'მოწონება'}
          </span>
        </motion.button>
        
        <AnimatePresence>
          {showPicker && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowPicker(false)}
              />
              
              {/* Picker - supports touch drag */}
              <motion.div 
                ref={pickerRef}
                className="fixed z-[100]"
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 20,
                }}
                style={{
                  left: buttonRef.current ? Math.max(10, Math.min(buttonRef.current.getBoundingClientRect().left - 80, window.innerWidth - 320)) : '50%',
                  bottom: buttonRef.current ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 8 : 'auto',
                }}
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
                      initial={{ opacity: 0, y: 30, scale: 0 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: 1,
                      }}
                      transition={{ 
                        delay: index * 0.03,
                        type: "spring",
                        stiffness: 600,
                        damping: 15
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(reaction.type);
                      }}
                      onMouseEnter={() => setHoveredReaction(reaction.type)}
                      onMouseLeave={() => setHoveredReaction(null)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setHoveredReaction(reaction.type);
                      }}
                      className={cn(
                        "relative touch-manipulation rounded-full p-0.5",
                        activeReactions.includes(reaction.type) && "bg-primary/20 ring-2 ring-primary/50"
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
    );
  }
);

ReactionPicker.displayName = 'ReactionPicker';

export const getReactionEmoji = (type: string) => {
  return REACTIONS.find(r => r.type === type)?.emoji || '👍';
};

export const getReactionLabel = (type: string) => {
  return REACTIONS.find(r => r.type === type)?.label || 'მოწონება';
};

export const REACTION_TYPES = REACTIONS;

export default ReactionPicker;