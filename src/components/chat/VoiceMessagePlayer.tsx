import { useState, useRef, useEffect, memo } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  className?: string;
}

const VoiceMessagePlayer = memo(({ audioUrl, duration, className }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(duration && duration > 0 ? duration : 0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Use passed duration prop
  useEffect(() => {
    if (duration && duration > 0 && !isNaN(duration) && isFinite(duration)) {
      setTotalDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      // Only update if we got valid duration from audio
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    // Handle invalid values
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress || !totalDuration) return;

    const rect = progress.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * totalDuration;
  };

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Generate compact waveform bars (reduced from 30 to 20)
  const bars = Array.from({ length: 20 }, (_, i) => {
    const height = Math.sin((i / 20) * Math.PI) * 0.6 + 0.4;
    const isActive = (i / 20) * 100 <= progressPercentage;
    return { height, isActive };
  });

  // Display time: show remaining when playing, total when paused
  const displayTime = isPlaying ? currentTime : totalDuration;

  return (
    <div className={cn("flex items-center gap-2 py-1 px-1", className)}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Compact Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Compact Waveform visualization */}
      <div 
        ref={progressRef}
        onClick={handleProgressClick}
        className="flex-1 flex items-center gap-px h-6 cursor-pointer min-w-[80px] max-w-[120px]"
      >
        {bars.map((bar, i) => (
          <div
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-colors",
              bar.isActive ? "bg-primary" : "bg-muted-foreground/40"
            )}
            style={{ height: `${bar.height * 100}%` }}
          />
        ))}
      </div>

      {/* Duration - always show valid time */}
      <span className="text-[11px] text-muted-foreground min-w-[32px] text-right tabular-nums">
        {formatTime(displayTime)}
      </span>
    </div>
  );
});

VoiceMessagePlayer.displayName = 'VoiceMessagePlayer';

export default VoiceMessagePlayer;
