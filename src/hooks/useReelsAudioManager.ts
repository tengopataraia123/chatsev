import { useRef, useCallback, useEffect } from 'react';
import { clearMediaSession } from './useDisableMediaSession';

/**
 * Global Audio Manager for Reels
 * Ensures only ONE video plays audio at a time across the entire app
 * Prevents the "double audio" bug when scrolling between reels
 */

// Global registry of all active video elements
const activeVideos = new Map<string, HTMLVideoElement>();

// Currently playing video ID
let currentlyPlayingId: string | null = null;

// Subscribers for state changes
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach(fn => fn());
};

export const useReelsAudioManager = (reelId: string) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isRegistered = useRef(false);

  // Register video element
  const registerVideo = useCallback((video: HTMLVideoElement | null) => {
    if (video && !isRegistered.current) {
      activeVideos.set(reelId, video);
      isRegistered.current = true;
      videoRef.current = video;
    }
  }, [reelId]);

  // Unregister and cleanup
  const unregisterVideo = useCallback(() => {
    if (isRegistered.current) {
      const video = activeVideos.get(reelId);
      if (video) {
        video.pause();
        video.muted = true;
        video.currentTime = 0;
      }
      activeVideos.delete(reelId);
      isRegistered.current = false;
      
      if (currentlyPlayingId === reelId) {
        currentlyPlayingId = null;
      }
    }
  }, [reelId]);

  // Activate this video (play with sound), mute all others
  const activateVideo = useCallback((muted: boolean = false) => {
    // First, pause and mute ALL other videos
    activeVideos.forEach((video, id) => {
      if (id !== reelId) {
        video.pause();
        video.muted = true;
        video.currentTime = 0;
      }
    });

    // Now play this video
    const thisVideo = activeVideos.get(reelId);
    if (thisVideo) {
      thisVideo.muted = muted;
      thisVideo.currentTime = 0;
      thisVideo.play()
        .then(() => {
          currentlyPlayingId = reelId;
          clearMediaSession();
          notifySubscribers();
        })
        .catch(console.warn);
    }
  }, [reelId]);

  // Deactivate this video
  const deactivateVideo = useCallback(() => {
    const video = activeVideos.get(reelId);
    if (video) {
      video.pause();
      video.muted = true;
    }
    if (currentlyPlayingId === reelId) {
      currentlyPlayingId = null;
      notifySubscribers();
    }
  }, [reelId]);

  // Toggle mute
  const toggleMute = useCallback((muted: boolean) => {
    const video = activeVideos.get(reelId);
    if (video) {
      video.muted = muted;
      video.volume = muted ? 0 : 1;
      clearMediaSession();
    }
  }, [reelId]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const video = activeVideos.get(reelId);
    if (video) {
      if (video.paused) {
        // When resuming, first pause all others
        activeVideos.forEach((v, id) => {
          if (id !== reelId) {
            v.pause();
            v.muted = true;
          }
        });
        video.play()
          .then(() => {
            currentlyPlayingId = reelId;
            clearMediaSession();
          })
          .catch(console.warn);
        return true; // now playing
      } else {
        video.pause();
        if (currentlyPlayingId === reelId) {
          currentlyPlayingId = null;
        }
        return false; // now paused
      }
    }
    return false;
  }, [reelId]);

  // Check if this video is the active one
  const isActive = useCallback(() => {
    return currentlyPlayingId === reelId;
  }, [reelId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unregisterVideo();
    };
  }, [unregisterVideo]);

  return {
    registerVideo,
    unregisterVideo,
    activateVideo,
    deactivateVideo,
    toggleMute,
    togglePlay,
    isActive,
    videoRef,
  };
};

/**
 * Hook to pause ALL reels globally
 * Useful when opening other media (stories, music player, etc.)
 */
export const usePauseAllReels = () => {
  return useCallback(() => {
    activeVideos.forEach((video) => {
      video.pause();
      video.muted = true;
    });
    currentlyPlayingId = null;
    clearMediaSession();
    notifySubscribers();
  }, []);
};

/**
 * Subscribe to currently playing reel changes
 */
export const useCurrentlyPlayingReel = (callback: () => void) => {
  useEffect(() => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, [callback]);

  return currentlyPlayingId;
};

export default useReelsAudioManager;
