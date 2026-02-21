import { memo } from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  isOffline: boolean;
}

export const OfflineIndicator = memo(({ isOffline }: OfflineIndicatorProps) => {
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive/90 text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top duration-300">
      <WifiOff className="w-4 h-4" />
      <span>ინტერნეტთან კავშირი არ არის</span>
    </div>
  );
});

OfflineIndicator.displayName = 'OfflineIndicator';
