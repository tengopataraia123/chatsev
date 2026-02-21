import { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RealTimeClockProps {
  compact?: boolean;
}

const RealTimeClock = ({ compact = false }: RealTimeClockProps) => {
  const [time, setTime] = useState(new Date());
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setIsFlashing(prev => !prev);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return { hours, minutes, seconds };
  };

  const { hours, minutes, seconds } = formatTime(time);

  // Compact version for mobile
  if (compact) {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/50 rounded border border-border/50">
        <Clock className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-medium text-foreground tabular-nums">
          {hours}
          <span className={`text-primary mx-px ${isFlashing ? 'opacity-100' : 'opacity-30'}`}>:</span>
          {minutes}
          <span className={`text-primary mx-px ${isFlashing ? 'opacity-100' : 'opacity-30'}`}>:</span>
          <span className="text-accent-foreground">{seconds}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-xl border border-border/20 whitespace-nowrap">
      {/* Date */}
      <div className="flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground tabular-nums">
          {formatDate(time)}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-border/50 shrink-0" />

      {/* Time - Inline format */}
      <div className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground tabular-nums">
          {hours}
          <span className={`text-primary mx-0.5 ${isFlashing ? 'opacity-100' : 'opacity-40'}`}>:</span>
          {minutes}
          <span className={`text-primary mx-0.5 ${isFlashing ? 'opacity-100' : 'opacity-40'}`}>:</span>
          <span className="text-accent-foreground">{seconds}</span>
        </span>
      </div>
    </div>
  );
};

export default RealTimeClock;