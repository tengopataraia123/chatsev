import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingEmojiProps {
  emoji: string;
  onComplete: () => void;
}

const FloatingEmoji = memo(({ emoji, onComplete }: FloatingEmojiProps) => {
  // Generate random positions for multiple emojis
  const [particles] = useState(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 120 - 60, // -60 to 60
      delay: Math.random() * 0.15,
      scale: 0.6 + Math.random() * 0.8,
      rotation: Math.random() * 40 - 20,
    }))
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 1, 
              y: '50vh', 
              x: `calc(50vw + ${p.x}px)`,
              scale: 0,
              rotate: 0
            }}
            animate={{ 
              opacity: [1, 1, 0], 
              y: `calc(50vh - ${120 + Math.random() * 80}px)`,
              scale: [0, p.scale, p.scale * 0.7],
              rotate: p.rotation,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.9 + p.delay, 
              delay: p.delay,
              ease: [0.2, 0, 0, 1]
            }}
            className="absolute text-3xl select-none"
          >
            {emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

FloatingEmoji.displayName = 'FloatingEmoji';

export default FloatingEmoji;
