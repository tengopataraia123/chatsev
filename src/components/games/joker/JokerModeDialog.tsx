import { memo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Suit, SUIT_SYMBOLS, SUIT_NAMES_GE } from './types';
import { cn } from '@/lib/utils';

interface JokerModeDialogProps {
  open: boolean;
  onSelect: (mode: 'high' | 'low', suit: Suit) => void;
}

const JokerModeDialog = memo(function JokerModeDialog({
  open,
  onSelect
}: JokerModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<'high' | 'low' | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);

  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

  const handleConfirm = () => {
    if (selectedMode && selectedSuit) {
      onSelect(selectedMode, selectedSuit);
      setSelectedMode(null);
      setSelectedSuit(null);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">
            🃏 ჯოკერის რეჟიმი
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Mode selection */}
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">აირჩიეთ რეჟიმი:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedMode === 'high' ? "default" : "outline"}
                className={cn(
                  "h-16 flex flex-col gap-1",
                  selectedMode === 'high' && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedMode('high')}
              >
                <span className="text-lg">⬆️</span>
                <span className="text-sm font-medium">მაღალი</span>
                <span className="text-[10px] text-muted-foreground">სხვებმა უმაღლესი უნდა</span>
              </Button>
              <Button
                variant={selectedMode === 'low' ? "default" : "outline"}
                className={cn(
                  "h-16 flex flex-col gap-1",
                  selectedMode === 'low' && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedMode('low')}
              >
                <span className="text-lg">⬇️</span>
                <span className="text-sm font-medium">დაბალი</span>
                <span className="text-[10px] text-muted-foreground">ნებისმიერი კარტი</span>
              </Button>
            </div>
          </div>

          {/* Suit selection */}
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">აირჩიეთ სუტი:</p>
            <div className="grid grid-cols-4 gap-2">
              {suits.map((suit) => (
                <Button
                  key={suit}
                  variant={selectedSuit === suit ? "default" : "outline"}
                  className={cn(
                    "h-16 flex flex-col gap-1",
                    selectedSuit === suit && "ring-2 ring-primary",
                    suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : ''
                  )}
                  onClick={() => setSelectedSuit(suit)}
                >
                  <span className="text-2xl">{SUIT_SYMBOLS[suit]}</span>
                  <span className="text-[10px]">{SUIT_NAMES_GE[suit]}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Confirm button */}
          <Button 
            className="w-full" 
            disabled={!selectedMode || !selectedSuit}
            onClick={handleConfirm}
          >
            დადასტურება
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default JokerModeDialog;
