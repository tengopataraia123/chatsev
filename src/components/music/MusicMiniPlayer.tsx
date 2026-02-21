import { Play, Pause, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MusicTrack } from './ModernMusicPlayer';

interface MusicMiniPlayerProps {
  track: MusicTrack | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onClose: () => void;
  onExpand: () => void;
  currentTime: number;
  duration: number;
  className?: string;
}

const MusicMiniPlayer = ({
  track,
  isPlaying,
  onPlayPause,
  onNext,
  onClose,
  onExpand,
  currentTime,
  duration,
  className,
}: MusicMiniPlayerProps) => {
  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      "fixed bottom-16 md:bottom-0 left-0 right-0 z-40",
      className
    )}>
      {/* Progress bar (thin) */}
      <div className="h-0.5 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="bg-background/95 backdrop-blur-xl border-t border-border">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2 p-2">
          {/* Album art */}
          <div 
            className="w-10 h-10 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex-shrink-0 overflow-hidden cursor-pointer"
            onClick={onExpand}
          >
            {track.cover_url ? (
              <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/20">
                <span className="text-xs font-bold text-primary">♪</span>
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
            <p className="text-sm font-medium truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate">{track.artist || 'უცნობი'}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onPlayPause}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onNext}
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicMiniPlayer;