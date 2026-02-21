import { useEffect, useCallback } from 'react';

/**
 * Hook to disable the browser's Media Session API
 * This prevents the phone's notification panel from showing media controls
 * which can cause audio to appear to play "twice"
 */
export const useDisableMediaSession = () => {
  useEffect(() => {
    // Check if Media Session API is available
    if ('mediaSession' in navigator) {
      // Clear any existing metadata
      navigator.mediaSession.metadata = null;
      
      // Set empty action handlers to prevent default behavior
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'stop',
        'seekbackward',
        'seekforward',
        'seekto',
        'previoustrack',
        'nexttrack',
      ];
      
      actions.forEach(action => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {
          // Some actions might not be supported
        }
      });
      
      // Set playback state to none
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch (e) {
        // Playback state might not be supported
      }
    }
    
    return () => {
      // Cleanup - already nulled out
    };
  }, []);
};

/**
 * Function to clear media session on video/audio play
 * Call this whenever media starts playing
 * Enhanced version that aggressively clears Media Session
 */
export const clearMediaSession = () => {
  if ('mediaSession' in navigator) {
    try {
      // Clear metadata immediately
      navigator.mediaSession.metadata = null;
      
      // Set playback state to none
      navigator.mediaSession.playbackState = 'none';
      
      // Clear all action handlers
      const actions: MediaSessionAction[] = [
        'play', 'pause', 'stop', 'seekbackward', 'seekforward',
        'seekto', 'previoustrack', 'nexttrack',
      ];
      
      actions.forEach(action => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      });
    } catch (e) {
      // Silently ignore errors
    }
  }
};

/**
 * Hook that provides a callback to clear media session
 * Useful for components that need to clear session on specific events
 */
export const useClearMediaSession = () => {
  const clear = useCallback(() => {
    clearMediaSession();
  }, []);
  
  return clear;
};

export default useDisableMediaSession;
