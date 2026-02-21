import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Repeat1, Shuffle, ListMusic, Heart, ChevronDown,
  MoreHorizontal, Share2, Plus
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  album?: string | null;
  audio_url: string;
  cover_url: string | null;
  duration?: number;
  plays?: number;
  user_id: string;
}

interface ModernMusicPlayerProps {
  track: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onQueueClick: () => void;
  onLike: (trackId: string) => void;
  onAddToPlaylist: (trackId: string) => void;
  isLiked: boolean;
  repeatMode: 'off' | 'one' | 'all';
  shuffleOn: boolean;
  onRepeatToggle: () => void;
  onShuffleToggle: () => void;
  currentTime: number;
  duration: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

const ModernMusicPlayer = ({
  track,
  queue,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onQueueClick,
  onLike,
  onAddToPlaylist,
  isLiked,
  repeatMode,
  shuffleOn,
  onRepeatToggle,
  onShuffleToggle,
  currentTime,
  duration,
  isExpanded = false,
  onToggleExpand,
  className,
}: ModernMusicPlayerProps) => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!track) return null;

  // Mini player (collapsed)
  if (!isExpanded) {
    return (
      <div className={cn(
        "fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border shadow-2xl",
        className
      )}>
        <div className="max-w-screen-xl mx-auto">
          {/* Progress bar (thin) */}
          <div className="h-1 bg-muted relative">
            <div 
              className="absolute h-full bg-primary transition-all duration-150"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          
          <div className="flex items-center gap-3 p-2 sm:p-3">
            {/* Album art */}
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex-shrink-0 overflow-hidden cursor-pointer"
              onClick={onToggleExpand}
            >
              {track.cover_url ? (
                <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ListMusic className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
              <h4 className="font-semibold text-sm truncate">{track.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{track.artist || 'უცნობი'}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex h-8 w-8"
                onClick={onPrevious}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={onPlayPause}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onNext}
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 hidden sm:flex", isLiked && "text-red-500")}
                onClick={() => onLike(track.id)}
              >
                <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full player (expanded)
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={onToggleExpand}>
          <ChevronDown className="w-6 h-6" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">ახლა უკრავს</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddToPlaylist(track.id)}>
              <Plus className="w-4 h-4 mr-2" />
              პლეილისტში დამატება
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="w-4 h-4 mr-2" />
              გაზიარება
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onQueueClick}>
              <ListMusic className="w-4 h-4 mr-2" />
              რიგი ({queue.length})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Album Art */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm aspect-square rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 shadow-2xl overflow-hidden">
          {track.cover_url ? (
            <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ListMusic className="w-24 h-24 text-primary/50" />
            </div>
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="px-8 mb-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold truncate">{track.title}</h2>
            <p className="text-lg text-muted-foreground truncate">{track.artist || 'უცნობი'}</p>
            {track.album && (
              <p className="text-sm text-muted-foreground truncate">{track.album}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-10 w-10", isLiked && "text-red-500")}
            onClick={() => onLike(track.id)}
          >
            <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-8 mb-4">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={(v) => onSeek(v[0])}
          className="cursor-pointer"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10", shuffleOn && "text-primary")}
          onClick={onShuffleToggle}
        >
          <Shuffle className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12"
          onClick={onPrevious}
        >
          <SkipBack className="w-7 h-7" fill="currentColor" />
        </Button>
        
        <Button
          size="icon"
          className="h-16 w-16 rounded-full shadow-lg"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8" fill="currentColor" />
          ) : (
            <Play className="w-8 h-8 ml-1" fill="currentColor" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12"
          onClick={onNext}
        >
          <SkipForward className="w-7 h-7" fill="currentColor" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10", repeatMode !== 'off' && "text-primary")}
          onClick={onRepeatToggle}
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-5 h-5" />
          ) : (
            <Repeat className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-center gap-3 px-8 pb-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleMute}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        <div className="w-32">
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onQueueClick}
        >
          <ListMusic className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ModernMusicPlayer;