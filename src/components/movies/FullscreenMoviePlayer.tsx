import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Loader2, AlertTriangle
} from 'lucide-react';
import { MovieSource, MovieSourceType } from './types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import Hls from 'hls.js';

interface FullscreenMoviePlayerProps {
  source: MovieSource;
  movieTitle: string;
  allSources: MovieSource[];
  onClose: () => void;
  onSourceChange: (sourceId: string) => void;
}

// URL validation
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Extract YouTube video ID
const getYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Extract Vimeo video ID
const getVimeoId = (url: string): string | null => {
  const regExp = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Format time
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const FullscreenMoviePlayer = memo(({ 
  source, 
  movieTitle, 
  allSources, 
  onClose, 
  onSourceChange 
}: FullscreenMoviePlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);

  // Lock body scroll and handle screen orientation
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    // Try to lock screen orientation to landscape when in fullscreen
    const lockOrientation = async () => {
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          // Don't lock initially, let user rotate freely
        }
      } catch (e) {
        // Orientation lock not supported
      }
    };
    lockOrientation();

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      // Unlock orientation on close
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch (e) {
        // Ignore errors
      }
    };
  }, []);

  // Auto fullscreen on landscape orientation
  useEffect(() => {
    const handleOrientationChange = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      
      if (isLandscape && isMobile && !document.fullscreenElement) {
        container.requestFullscreen?.().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          // Fullscreen request failed
        });
      }
    };

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    window.matchMedia('(orientation: landscape)').addEventListener('change', handleOrientationChange);
    
    // Check initial orientation
    handleOrientationChange();

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.matchMedia('(orientation: landscape)').removeEventListener('change', handleOrientationChange);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'Escape':
          onClose();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          setIsMuted(prev => !prev);
          break;
        case 'ArrowLeft':
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
        case 'ArrowUp':
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, onClose]);

  // Initialize video for mp4/hls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (source.source_type !== 'mp4' && source.source_type !== 'hls_m3u8') return;

    // Cleanup previous HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    if (source.source_type === 'hls_m3u8') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(source.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError('ვიდეოს ჩატვირთვა ვერ მოხერხდა');
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source.url;
      } else {
        setError('HLS არ არის მხარდაჭერილი');
        setIsLoading(false);
      }
    } else {
      video.src = source.url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [source]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      setError('ვიდეოს ჩატვირთვა ვერ მოხერხდა');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, []);

  // Apply volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = value[0];
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  }, []);

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  // Render based on source type
  const renderPlayer = () => {
    if (!isValidUrl(source.url)) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <p className="text-destructive text-lg">არასწორი URL</p>
          </div>
        </div>
      );
    }

    switch (source.source_type) {
      case 'mp4':
      case 'hls_m3u8':
        return (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            onClick={togglePlay}
          />
        );

      case 'youtube': {
        const videoId = getYouTubeId(source.url);
        if (!videoId) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-destructive">არასწორი YouTube ლინკი</p>
            </div>
          );
        }
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          />
        );
      }

      case 'vimeo': {
        const videoId = getVimeoId(source.url);
        if (!videoId) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-destructive">არასწორი Vimeo ლინკი</p>
            </div>
          );
        }
        return (
          <iframe
            src={`https://player.vimeo.com/video/${videoId}?autoplay=1&dnt=1`}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          />
        );
      }

      case 'iframe':
        return (
          <iframe
            src={source.url}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox"
          />
        );

      case 'external':
        return (
          <iframe
            src={source.url}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox"
          />
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground">მხარდაუჭერელი ფორმატი</p>
          </div>
        );
    }
  };

  const isNativeVideo = source.source_type === 'mp4' || source.source_type === 'hls_m3u8';

  const content = (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ isolation: 'isolate' }}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
    >
      {/* Top Bar */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 flex-shrink-0"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-white font-semibold truncate">{movieTitle}</h2>
          </div>
          
          {/* Source Selector */}
          {allSources.length > 1 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => setShowSourceSelector(!showSourceSelector)}
              >
                <Settings className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">{source.label}</span>
                {source.quality && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {source.quality}
                  </Badge>
                )}
              </Button>
              
              {showSourceSelector && (
                <div className="absolute right-0 top-full mt-2 bg-black/90 backdrop-blur-sm rounded-lg border border-white/20 p-2 min-w-[180px] z-20">
                  {allSources.map((s) => (
                    <button
                      key={s.id}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        s.id === source.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-white hover:bg-white/10'
                      }`}
                      onClick={() => {
                        onSourceChange(s.id);
                        setShowSourceSelector(false);
                      }}
                    >
                      <span>{s.label}</span>
                      {s.quality && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {s.quality}
                        </Badge>
                      )}
                      {s.language && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          {s.language}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 flex items-center justify-center relative">
        {renderPlayer()}
        
        {/* Loading Indicator */}
        {isLoading && isNativeVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-4">
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-destructive text-lg">{error}</p>
            </div>
          </div>
        )}

        {/* Center Play Button (for native video) */}
        {isNativeVideo && !isPlaying && !isLoading && !error && (
          <button
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={togglePlay}
          >
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-10 h-10 text-primary-foreground ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Bottom Controls (for native video) */}
      {isNativeVideo && (
        <div 
          className={`absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/70 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-9 w-9"
                onClick={togglePlay}
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
                className="text-white hover:bg-white/20 h-9 w-9 hidden sm:flex"
                onClick={skipBackward}
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-9 w-9 hidden sm:flex"
                onClick={skipForward}
              >
                <SkipForward className="w-5 h-5" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-1 group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-9 w-9"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                <div className="w-0 overflow-hidden group-hover:w-20 transition-all duration-200">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
});

FullscreenMoviePlayer.displayName = 'FullscreenMoviePlayer';

export default FullscreenMoviePlayer;
