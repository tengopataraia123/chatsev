import { memo } from 'react';
import { Card, SUIT_SYMBOLS, SUIT_COLORS } from './types';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  small?: boolean;
  className?: string;
}

const PlayingCard = memo(function PlayingCard({
  card,
  onClick,
  disabled = false,
  selected = false,
  faceDown = false,
  small = false,
  className
}: PlayingCardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-primary/30 flex items-center justify-center',
          'bg-gradient-to-br from-primary/80 to-primary/60',
          small ? 'w-10 h-14' : 'w-16 h-22 sm:w-20 sm:h-28',
          className
        )}
      >
        <div className="w-3/4 h-3/4 rounded border border-white/20 bg-white/10" />
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg border-2 bg-white dark:bg-gray-100 shadow-md transition-all duration-200',
        'flex flex-col items-center justify-between p-1',
        small ? 'w-10 h-14 text-xs' : 'w-16 h-22 sm:w-20 sm:h-28 text-sm sm:text-base',
        selected && 'ring-2 ring-yellow-400 -translate-y-2 shadow-lg shadow-yellow-400/30',
        !disabled && 'hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95',
        disabled && 'opacity-60 cursor-not-allowed',
        'border-gray-300 dark:border-gray-400',
        className
      )}
    >
      {/* Top left corner */}
      <div className={cn('self-start font-bold', suitColor, small ? 'text-[10px]' : 'text-sm sm:text-lg')}>
        <div className="leading-none">{card.rank}</div>
        <div className="leading-none">{suitSymbol}</div>
      </div>

      {/* Center */}
      <div className={cn('text-2xl sm:text-4xl', suitColor, small && 'text-lg')}>
        {suitSymbol}
      </div>

      {/* Bottom right corner (rotated) */}
      <div className={cn('self-end font-bold rotate-180', suitColor, small ? 'text-[10px]' : 'text-sm sm:text-lg')}>
        <div className="leading-none">{card.rank}</div>
        <div className="leading-none">{suitSymbol}</div>
      </div>
    </button>
  );
});

export default PlayingCard;
