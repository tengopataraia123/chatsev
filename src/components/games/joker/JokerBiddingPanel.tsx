import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getForbiddenBidForDealer } from './gameLogic';
import { motion } from 'framer-motion';

interface JokerBiddingPanelProps {
  cardsPerRound: number;
  existingBids: number[];
  isDealer: boolean;
  onBid: (bid: number) => void;
  otherBids: Record<string, number>;
  playerNames: Record<string, string>;
  timerSeconds?: number;
}

const BID_TIMER_DEFAULT = 30; // seconds

const JokerBiddingPanel = memo(function JokerBiddingPanel({
  cardsPerRound,
  existingBids,
  isDealer,
  onBid,
  otherBids,
  playerNames,
  timerSeconds = BID_TIMER_DEFAULT
}: JokerBiddingPanelProps) {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmittedRef = useRef(false);

  const forbiddenBid = isDealer ? getForbiddenBidForDealer(cardsPerRound, existingBids) : -1;

  // Countdown timer
  useEffect(() => {
    hasSubmittedRef.current = false;
    setTimeLeft(timerSeconds);
    setSelectedBid(null);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerSeconds]);

  // Auto-pass when timer expires
  useEffect(() => {
    if (timeLeft === 0 && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      // Auto-pass (bid 0), but if 0 is forbidden for dealer, pick first allowed
      let autoBid = 0;
      if (isDealer && autoBid === forbiddenBid) {
        autoBid = autoBid === 0 ? 1 : 0;
      }
      onBid(autoBid);
    }
  }, [timeLeft, onBid, isDealer, forbiddenBid]);

  const handleConfirm = useCallback(() => {
    if (selectedBid !== null && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      onBid(selectedBid);
    }
  }, [selectedBid, onBid]);

  const timerPercent = (timeLeft / timerSeconds) * 100;

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl border-t border-white/10 rounded-t-2xl pb-safe"
    >
      {/* Timer bar */}
      <div className="h-1 bg-white/10 w-full">
        <div
          className={cn(
            "h-full transition-all duration-1000 linear rounded-full",
            timeLeft > 10 ? "bg-green-500" : timeLeft > 5 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      <div className="px-3 pt-2 pb-3 space-y-2">
        {/* Header row with timer */}
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-sm">🎯 რამდენს მოიგებ?</span>
          <span className={cn(
            "text-sm font-mono font-bold px-2 py-0.5 rounded-full",
            timeLeft > 10 ? "bg-green-500/20 text-green-400" :
            timeLeft > 5 ? "bg-yellow-500/20 text-yellow-400" :
            "bg-red-500/20 text-red-400 animate-pulse"
          )}>
            {timeLeft}წ
          </span>
        </div>

        {/* Other bids info */}
        {Object.keys(otherBids).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(otherBids).map(([pid, bid]) => (
              <span key={pid} className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full">
                {playerNames[pid] || '?'}: <strong>{bid === 0 ? 'პას' : bid}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Dealer warning */}
        {isDealer && forbiddenBid >= 0 && forbiddenBid <= cardsPerRound && (
          <div className="text-orange-400 text-[11px]">
            ⚠️ დილერი ვერ აირჩევს: <strong>{forbiddenBid}</strong>
          </div>
        )}

        {/* Bid buttons */}
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: cardsPerRound + 1 }, (_, i) => i).map((bid) => {
            const isForbidden = isDealer && bid === forbiddenBid;
            return (
              <button
                key={bid}
                className={cn(
                  "h-10 min-w-[40px] px-2 rounded-xl text-sm font-bold transition-all",
                  isForbidden && "opacity-20 cursor-not-allowed",
                  selectedBid === bid
                    ? "bg-primary text-primary-foreground ring-2 ring-primary scale-110"
                    : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                )}
                disabled={isForbidden}
                onClick={() => !isForbidden && setSelectedBid(bid)}
              >
                {bid === 0 ? 'პას' : bid}
              </button>
            );
          })}
        </div>

        {/* Confirm */}
        <Button
          className="w-full h-10 font-bold"
          disabled={selectedBid === null}
          onClick={handleConfirm}
        >
          დადასტურება {selectedBid !== null && (selectedBid === 0 ? '(პას)' : `(${selectedBid})`)}
        </Button>
      </div>
    </motion.div>
  );
});

export default JokerBiddingPanel;
