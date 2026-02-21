import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatVideoMessageProps {
  videoUrl: string;
  duration?: number;
  className?: string;
}

const ChatVideoMessage = ({ videoUrl, duration, className }: ChatVideoMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleRetry = () => {
    setError(false);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  if (error) {
    return (
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-black/80 aspect-video flex items-center justify-center",
        className
      )}>
        <div className="text-center text-white">
          <p className="text-sm mb-2">ვიდეოს ჩატვირთვა ვერ მოხერხდა</p>
          <Button size="sm" variant="secondary" onClick={handleRetry}>
            <RotateCcw className="w-4 h-4 mr-1" />
            თავიდან
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-xl overflow-hidden bg-black group cursor-pointer",
        isFullscreen && "flex items-center justify-center w-full h-full",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className={cn(
          "w-full h-full object-contain",
          isFullscreen ? "max-h-full max-w-full" : "max-h-[300px]"
        )}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        onClick={handlePlayPause}
        playsInline
        preload="metadata"
        muted={isMuted}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* Play Button Overlay (when paused) */}
      {!isLoading && !isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
          onClick={handlePlayPause}
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Duration Badge (when paused and not loading) */}
      {!isLoading && !isPlaying && videoDuration > 0 && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatTime(videoDuration)}
        </div>
      )}

      {/* Controls Bar */}
      {!isLoading && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress Bar */}
          <Slider
            value={[currentTime]}
            max={videoDuration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="mb-2"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-white hover:bg-white/20"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" fill="currentColor" />
                ) : (
                  <Play className="w-4 h-4" fill="currentColor" />
                )}
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-16 hidden sm:block"
                />
              </div>

              {/* Time */}
              <span className="text-white text-xs">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>
            </div>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-white/20"
              onClick={handleFullscreen}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatVideoMessage;
