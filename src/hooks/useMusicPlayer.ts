import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { MusicTrack } from '@/components/music/ModernMusicPlayer';

export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: 'off' | 'one' | 'all';
  shuffleOn: boolean;
  isExpanded: boolean;
  showQueue: boolean;
  likedTracks: Set<string>;
}

export const useMusicPlayer = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [state, setState] = useState<MusicPlayerState>({
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    repeatMode: 'off',
    shuffleOn: false,
    isExpanded: false,
    showQueue: false,
    likedTracks: new Set(),
  });

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(s => ({ ...s, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState(s => ({ ...s, duration: audio.duration }));
    };

    const handleEnded = () => {
      handleNext();
    };

    const handlePlay = () => {
      setState(s => ({ ...s, isPlaying: true }));
    };

    const handlePause = () => {
      setState(s => ({ ...s, isPlaying: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Fetch liked tracks
  useEffect(() => {
    const fetchLikedTracks = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('music_likes')
        .select('track_id')
        .eq('user_id', user.id);
      
      if (data) {
        setState(s => ({ 
          ...s, 
          likedTracks: new Set(data.map(d => d.track_id)) 
        }));
      }
    };
    
    fetchLikedTracks();
  }, [user]);

  const playTrack = useCallback((track: MusicTrack, newQueue?: MusicTrack[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (newQueue) {
      const index = newQueue.findIndex(t => t.id === track.id);
      setState(s => ({
        ...s,
        queue: newQueue,
        currentIndex: index >= 0 ? index : 0,
        currentTrack: track,
      }));
    } else {
      setState(s => {
        const existingIndex = s.queue.findIndex(t => t.id === track.id);
        if (existingIndex >= 0) {
          return { ...s, currentIndex: existingIndex, currentTrack: track };
        } else {
          const newQueue = [...s.queue, track];
          return { 
            ...s, 
            queue: newQueue, 
            currentIndex: newQueue.length - 1, 
            currentTrack: track 
          };
        }
      });
    }

    audio.src = track.audio_url;
    audio.play().catch(console.error);
    
    // Update play count
    supabase
      .from('music')
      .update({ plays: track.plays ? track.plays + 1 : 1 })
      .eq('id', track.id)
      .then();
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.currentTrack) return;

    if (state.isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [state.isPlaying, state.currentTrack]);

  const handleNext = useCallback(() => {
    const { queue, currentIndex, repeatMode, shuffleOn } = state;
    if (queue.length === 0) return;

    let nextIndex: number;

    if (repeatMode === 'one') {
      // Repeat current track
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      }
      return;
    }

    if (shuffleOn) {
      // Random track (excluding current)
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * queue.length);
      } while (randomIndex === currentIndex && queue.length > 1);
      nextIndex = randomIndex;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          // Stop playback
          setState(s => ({ ...s, isPlaying: false }));
          return;
        }
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      playTrack(nextTrack);
      setState(s => ({ ...s, currentIndex: nextIndex }));
    }
  }, [state, playTrack]);

  const handlePrevious = useCallback(() => {
    const audio = audioRef.current;
    const { queue, currentIndex } = state;
    
    // If more than 3 seconds in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (audio) audio.currentTime = 0;
      return;
    }

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      playTrack(prevTrack);
      setState(s => ({ ...s, currentIndex: prevIndex }));
    }
  }, [state, playTrack]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(s => ({
      ...s,
      repeatMode: s.repeatMode === 'off' ? 'all' : s.repeatMode === 'all' ? 'one' : 'off'
    }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(s => ({ ...s, shuffleOn: !s.shuffleOn }));
  }, []);

  const toggleExpand = useCallback(() => {
    setState(s => ({ ...s, isExpanded: !s.isExpanded }));
  }, []);

  const toggleQueue = useCallback(() => {
    setState(s => ({ ...s, showQueue: !s.showQueue, isExpanded: false }));
  }, []);

  const toggleLike = useCallback(async (trackId: string) => {
    if (!user) return;
    
    const isLiked = state.likedTracks.has(trackId);
    
    if (isLiked) {
      await supabase
        .from('music_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId);
      
      setState(s => {
        const newLiked = new Set(s.likedTracks);
        newLiked.delete(trackId);
        return { ...s, likedTracks: newLiked };
      });
    } else {
      await supabase
        .from('music_likes')
        .insert({ user_id: user.id, track_id: trackId });
      
      setState(s => {
        const newLiked = new Set(s.likedTracks);
        newLiked.add(trackId);
        return { ...s, likedTracks: newLiked };
      });
    }
  }, [user, state.likedTracks]);

  const addToQueue = useCallback((track: MusicTrack) => {
    setState(s => ({
      ...s,
      queue: [...s.queue, track]
    }));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState(s => {
      const newQueue = [...s.queue];
      newQueue.splice(index, 1);
      
      let newIndex = s.currentIndex;
      if (index < s.currentIndex) {
        newIndex--;
      } else if (index === s.currentIndex) {
        // Current track removed, stop
        audioRef.current?.pause();
        return { 
          ...s, 
          queue: newQueue, 
          currentIndex: -1, 
          currentTrack: null,
          isPlaying: false 
        };
      }
      
      return { ...s, queue: newQueue, currentIndex: newIndex };
    });
  }, []);

  const clearQueue = useCallback(() => {
    audioRef.current?.pause();
    setState(s => ({
      ...s,
      queue: [],
      currentIndex: -1,
      currentTrack: null,
      isPlaying: false
    }));
  }, []);

  const selectTrackFromQueue = useCallback((index: number) => {
    const track = state.queue[index];
    if (track) {
      playTrack(track);
      setState(s => ({ ...s, currentIndex: index }));
    }
  }, [state.queue, playTrack]);

  const closePlayer = useCallback(() => {
    audioRef.current?.pause();
    setState(s => ({
      ...s,
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isExpanded: false
    }));
  }, []);

  return {
    ...state,
    playTrack,
    togglePlayPause,
    handleNext,
    handlePrevious,
    seek,
    toggleRepeat,
    toggleShuffle,
    toggleExpand,
    toggleQueue,
    toggleLike,
    addToQueue,
    removeFromQueue,
    clearQueue,
    selectTrackFromQueue,
    closePlayer,
    isLiked: (trackId: string) => state.likedTracks.has(trackId),
  };
};