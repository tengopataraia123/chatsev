import { memo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getForbiddenBidForDealer } from './gameLogic';

interface JokerBiddingDialogProps {
  open: boolean;
  cardsPerRound: number;
  existingBids: number[];
  isDealer: boolean;
  onBid: (bid: number) => void;
}

const JokerBiddingDialog = memo(function JokerBiddingDialog({
  open,
  cardsPerRound,
  existingBids,
  isDealer,
  onBid
}: JokerBiddingDialogProps) {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  const forbiddenBid = isDealer ? getForbiddenBidForDealer(cardsPerRound, existingBids) : -1;

  const handleConfirm = () => {
    if (selectedBid !== null) {
      onBid(selectedBid);
      setSelectedBid(null);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">
            🎯 რამდენ ხმას მოიგებთ?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current bids info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>კარტების რაოდენობა: <strong>{cardsPerRound}</strong></p>
            <p>სხვების ბიდები: <strong>{existingBids.join(', ') || 'ჯერ არავის'}</strong></p>
            {isDealer && forbiddenBid >= 0 && forbiddenBid <= cardsPerRound && (
              <p className="text-orange-500 mt-2">
                ⚠️ დილერს არ შეუძლია: <strong>{forbiddenBid}</strong>
              </p>
            )}
          </div>

          {/* Bid options */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: cardsPerRound + 1 }, (_, i) => i).map((bid) => {
              const isForbidden = isDealer && bid === forbiddenBid;
              return (
                <Button
                  key={bid}
                  variant={selectedBid === bid ? "default" : "outline"}
                  className={cn(
                    "h-12 text-lg font-bold",
                    isForbidden && "opacity-30 cursor-not-allowed",
                    selectedBid === bid && "ring-2 ring-primary"
                  )}
                  disabled={isForbidden}
                  onClick={() => setSelectedBid(bid)}
                >
                  {bid === 0 ? 'პას' : bid}
                </Button>
              );
            })}
          </div>

          {/* Confirm button */}
          <Button 
            className="w-full" 
            disabled={selectedBid === null}
            onClick={handleConfirm}
          >
            დადასტურება
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default JokerBiddingDialog;
