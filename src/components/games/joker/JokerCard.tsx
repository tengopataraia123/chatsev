import { memo } from 'react';
import { Card, Suit, SUIT_SYMBOLS, SUIT_COLORS } from './types';
import { cn } from '@/lib/utils';

interface JokerCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  small?: boolean;
  faceDown?: boolean;
  isTrump?: boolean;
}

const JokerCard = memo(function JokerCard({ 
  card, 
  onClick, 
  disabled, 
  selected,
  small,
  faceDown,
  isTrump
}: JokerCardProps) {
  if (faceDown) {
    return (
      <div 
        className={cn(
          "bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-400 shadow-md flex items-center justify-center",
          small ? "w-10 h-14" : "w-14 h-20 sm:w-16 sm:h-24"
        )}
      >
        <div className="text-blue-200 text-2xl">🂠</div>
      </div>
    );
  }

  // Joker card
  if (card.isJoker) {
    return (
      <div 
        onClick={disabled ? undefined : onClick}
        className={cn(
          "bg-white dark:bg-gray-100 rounded-lg border-2 shadow-md flex flex-col items-center justify-center transition-all",
          small ? "w-10 h-14" : "w-14 h-20 sm:w-16 sm:h-24",
          selected && "ring-2 ring-primary transform -translate-y-2",
          disabled ? "opacity-50" : onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-1" : "",
          card.jokerType === 'red' ? "border-red-400" : "border-gray-800"
        )}
      >
        <span className={cn(
          "font-bold",
          small ? "text-lg" : "text-2xl",
          card.jokerType === 'red' ? "text-red-500" : "text-gray-800"
        )}>
          🃏
        </span>
        <span className={cn(
          "font-bold mt-1",
          small ? "text-[8px]" : "text-[10px]",
          card.jokerType === 'red' ? "text-red-500" : "text-gray-800"
        )}>
          JOKER
        </span>
      </div>
    );
  }

  const suit = card.suit as Suit;
  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitColor = SUIT_COLORS[suit];

  return (
    <div className="relative">
      {isTrump && (
        <div className="absolute -inset-0.5 rounded-lg bg-yellow-400/40 blur-sm animate-pulse pointer-events-none" />
      )}
      <div 
        onClick={disabled ? undefined : onClick}
        className={cn(
          "relative bg-white dark:bg-gray-100 rounded-lg border-2 shadow-md flex flex-col items-center justify-between p-1 transition-all",
          small ? "w-10 h-14" : "w-14 h-20 sm:w-16 sm:h-24",
          selected && "ring-2 ring-primary transform -translate-y-2",
          isTrump && "border-yellow-400",
          !isTrump && "border-gray-200",
          disabled ? "opacity-50" : onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-1" : ""
        )}
      >
      {/* Top left rank and suit */}
      <div className="self-start flex flex-col items-center leading-none">
        <span className={cn(
          "font-bold text-gray-900",
          small ? "text-xs" : "text-sm"
        )}>
          {card.rank}
        </span>
        <span className={cn(suitColor, small ? "text-xs" : "text-sm")}>
          {suitSymbol}
        </span>
      </div>
      
      {/* Center suit */}
      <span className={cn(
        suitColor,
        small ? "text-xl" : "text-2xl sm:text-3xl"
      )}>
        {suitSymbol}
      </span>
      
      {/* Bottom right rank and suit (inverted) */}
      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className={cn(
          "font-bold text-gray-900",
          small ? "text-xs" : "text-sm"
        )}>
          {card.rank}
        </span>
        <span className={cn(suitColor, small ? "text-xs" : "text-sm")}>
          {suitSymbol}
        </span>
      </div>
    </div>
    </div>
  );
});

export default JokerCard;
