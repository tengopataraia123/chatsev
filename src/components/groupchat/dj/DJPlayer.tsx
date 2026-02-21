import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Volume2, VolumeX, Radio, Loader2, Heart, User, Play, Pause, Headphones, Music2, Disc3 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DJRoomState, DJTrack } from './types';

// Track if YT API is ready
let ytApiReady = false;
const ytApiReadyCallbacks: (() => void)[] = [];

interface DJPlayerProps {
  roomState: DJRoomState | null;
  currentTrack?: DJTrack | null;
  serverTime: number;
  isDJ: boolean;
  onSeek?: (positionMs: number) => void;
  listenerOverrideTrack?: DJTrack | null;
  onGoToLive?: () => void;
  onTrackEnded?: () => void;
}

const DJPlayer = memo(({ roomState, currentTrack, serverTime, isDJ, onSeek, listenerOverrideTrack, onGoToLive, onTrackEnded }: DJPlayerProps) => {
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSyncRef = useRef<number>(0);
  const playerRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const onTrackEndedRef = useRef(onTrackEnded);

  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  const getLivePosition = useCallback(() => {
    if (!roomState || !roomState.started_at || roomState.paused) {
      return roomState?.seek_base_ms || 0;
    }
    const startedAt = new Date(roomState.started_at).getTime();
    const elapsed = Date.now() - startedAt;
    return (roomState.seek_base_ms || 0) + elapsed;
  }, [roomState]);

  // Initialize YouTube API
  useEffect(() => {
    if ((window as any).YT && (window as any).YT.Player) {
      ytApiReady = true;
      return;
    }
    
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const checkReady = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          ytApiReady = true;
          ytApiReadyCallbacks.forEach(cb => cb());
          ytApiReadyCallbacks.length = 0;
          clearInterval(checkReady);
        }
      }, 100);
      return () => clearInterval(checkReady);
    }
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      ytApiReadyCallbacks.forEach(cb => cb());
      ytApiReadyCallbacks.length = 0;
    };
  }, []);

  const activeVideoId = listenerOverrideTrack?.youtube_video_id || roomState?.youtube_video_id;
  const isListenerMode = !!listenerOverrideTrack;

  // Create/update YouTube player
  useEffect(() => {
    const hasYoutubeVideo = (listenerOverrideTrack?.youtube_video_id) || 
                            (roomState?.source_type === 'youtube' && roomState?.youtube_video_id);
    
    if (!hasYoutubeVideo) {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
        playerRef.current = null;
        currentVideoIdRef.current = null;
      }
      setPlayerReady(false);
      setIsLoading(false);
      return;
    }

    const videoId = activeVideoId;
    if (!videoId) return;
    
    if (playerRef.current && currentVideoIdRef.current === videoId) return;

    const createPlayer = () => {
      if (!containerRef.current) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
        playerRef.current = null;
      }

      setIsLoading(true);
      setPlayerReady(false);
      
      const startSeconds = isListenerMode ? 0 : Math.floor(getLivePosition() / 1000);

      containerRef.current.innerHTML = '';
      const playerDiv = document.createElement('div');
      const containerId = 'dj-yt-player-' + Date.now();
      playerDiv.id = containerId;
      playerDiv.style.width = '100%';
      playerDiv.style.height = '100%';
      containerRef.current.appendChild(playerDiv);
      
      const newPlayer = new (window as any).YT.Player(containerId, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: isDJ || isListenerMode ? 1 : 0,
          disablekb: isDJ || isListenerMode ? 0 : 1,
          start: startSeconds,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          mute: 1
        },
        events: {
          onReady: (event: any) => {
            setIsLoading(false);
            setPlayerReady(true);
            currentVideoIdRef.current = videoId;
            playerRef.current = newPlayer;
            if (!roomState?.paused || isListenerMode) {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) setIsPlaying(true);
            else if (event.data === 2) setIsPlaying(false);
            else if (event.data === 0) {
              setIsPlaying(false);
              if (onTrackEndedRef.current && !isListenerMode) {
                onTrackEndedRef.current();
              }
            }
          },
          onError: () => setIsLoading(false)
        }
      });
    };

    if (ytApiReady) createPlayer();
    else ytApiReadyCallbacks.push(createPlayer);
  }, [activeVideoId, roomState?.source_type, isDJ, isListenerMode, getLivePosition, roomState?.paused]);

  const handleUnmute = useCallback(() => {
    setShowUnmuteOverlay(false);
    setIsMuted(false);
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
        playerRef.current.playVideo();
        setIsPlaying(true);
        setIsLive(true);
      } catch (e) {}
    }
  }, [volume, playerReady]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    try {
      const state = playerRef.current.getPlayerState?.();
      if (state === 1) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        setIsLive(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {}
  }, [playerReady]);

  const handleGoLive = useCallback(() => {
    if (isListenerMode && onGoToLive) {
      onGoToLive();
      setIsLive(true);
      return;
    }
    if (!playerRef.current || !playerReady) return;
    try {
      const livePos = getLivePosition() / 1000;
      playerRef.current.seekTo(livePos, true);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setIsLive(true);
    } catch (e) {}
  }, [playerReady, getLivePosition, isListenerMode, onGoToLive]);

  // Sync playback
  useEffect(() => {
    if (!roomState || !playerReady || !playerRef.current) return;
    try {
      if (roomState.paused) {
        playerRef.current.pauseVideo?.();
        setIsPlaying(false);
      } else if (isLive) {
        playerRef.current.playVideo?.();
        setIsPlaying(true);
        const now = Date.now();
        if (now - lastSyncRef.current > 15000) {
          lastSyncRef.current = now;
          const expectedPos = getLivePosition() / 1000;
          const currentPos = playerRef.current.getCurrentTime?.() || 0;
          if (Math.abs(expectedPos - currentPos) > 2) {
            playerRef.current.seekTo?.(expectedPos, true);
          }
        }
      }
    } catch (e) {}
  }, [roomState?.paused, getLivePosition, playerReady, isLive, roomState?.seek_base_ms, roomState?.started_at]);

  // Update position
  useEffect(() => {
    const interval = setInterval(() => setCurrentPosition(getLivePosition()), 1000);
    return () => clearInterval(interval);
  }, [getLivePosition]);

  // Volume control
  useEffect(() => {
    if (playerRef.current && playerReady && !showUnmuteOverlay) {
      try {
        playerRef.current.setVolume?.(isMuted ? 0 : volume);
        if (isMuted) playerRef.current.mute?.();
        else playerRef.current.unMute?.();
      } catch (e) {}
    }
  }, [volume, isMuted, playerReady, showUnmuteOverlay]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // No active playback
  if (!roomState || (!roomState.youtube_video_id && !roomState.playback_url)) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/5 border border-border/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5" />
        <div className="relative px-6 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Disc3 className="w-10 h-10 text-muted-foreground/50 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <p className="text-lg font-medium text-muted-foreground">DJ ჯერ არ უკრავს</p>
          <p className="text-sm text-muted-foreground/60 mt-1">დაელოდე ან დაამატე სიმღერა რიგში</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-border/50 backdrop-blur-sm">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-conic from-purple-500/20 via-pink-500/20 to-purple-500/20 animate-spin" style={{ animationDuration: '20s' }} />
      </div>
      
      {/* Unmute Overlay */}
      {showUnmuteOverlay && roomState.youtube_video_id && (
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-md cursor-pointer"
          onClick={handleUnmute}
        >
          <div className="text-center p-6 animate-fade-in">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-pink-500/30 hover:scale-110 transition-transform">
              <Play className="w-12 h-12 text-white ml-1" />
            </div>
            <p className="text-white font-semibold text-lg">დააჭირე დასაკრავად</p>
            <p className="text-white/60 text-sm mt-1">ხმა ჩაირთვება ავტომატურად</p>
          </div>
        </div>
      )}
      
      {/* DJ Header */}
      <div className="relative px-4 py-3 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            {!roomState.paused && isLive && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
              DJ ლ ო ლ ი ტ ა
            </p>
            <p className="text-xs text-muted-foreground">ოთახის ვირტუალური დიჯეი</p>
          </div>
          {!roomState.paused && isLive && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-400">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Now Playing */}
      <div className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Album Art / Thumbnail */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-xl shadow-black/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              {currentTrack?.thumbnail_url ? (
                <img src={currentTrack.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : roomState.youtube_video_id ? (
                <img 
                  src={`https://img.youtube.com/vi/${roomState.youtube_video_id}/mqdefault.jpg`} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 className="w-8 h-8 text-muted-foreground/50" />
                </div>
              )}
            </div>
            {isPlaying && (
              <div className="absolute inset-0 rounded-xl border-2 border-pink-500/50 animate-pulse" />
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-base font-semibold truncate">
                {currentTrack?.title || (roomState.youtube_video_id ? 'იტვირთება...' : 'უცნობი ტრეკი')}
              </p>
              {currentTrack?.artist && (
                <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
              )}
            </div>

            {/* Requester */}
            {currentTrack?.requester_profile && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <Heart className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <Avatar className="w-5 h-5">
                  <AvatarImage src={currentTrack.requester_profile.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-pink-500/20">
                    <User className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-pink-400 truncate">
                  {currentTrack.requester_profile.username}
                </span>
                {currentTrack.dedication && (
                  <span className="text-xs text-muted-foreground italic truncate">
                    → {currentTrack.dedication}
                  </span>
                )}
              </div>
            )}

            {/* Time & Controls */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground">{formatTime(currentPosition)}</span>
              
              {!isLive && !isListenerMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGoLive}
                  className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Radio className="w-3 h-3 mr-1" />
                  LIVE-ზე გადასვლა
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* YouTube Player Container */}
        <div className="relative mt-4 aspect-video rounded-xl overflow-hidden bg-black/50">
          <div ref={containerRef} className="w-full h-full" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
          )}
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={(v) => { setVolume(v[0]); setIsMuted(false); }}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{isMuted ? 0 : volume}%</span>
        </div>
      </div>
    </div>
  );
});

DJPlayer.displayName = 'DJPlayer';

export default DJPlayer;
