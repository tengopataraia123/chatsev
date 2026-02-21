/**
 * Hook to track page visibility state.
 * Pauses heavy operations when user switches tabs or minimizes app.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { onVisibilityChange, getPageVisibility } from '@/lib/mobilePerformance';

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(getPageVisibility);

  useEffect(() => {
    return onVisibilityChange(setIsVisible);
  }, []);

  return isVisible;
};

/**
 * Runs a callback only when the page is visible.
 * Automatically pauses intervals/timers when hidden.
 */
export const useVisibilityAwareInterval = (
  callback: () => void,
  intervalMs: number,
  enabled = true
) => {
  const savedCallback = useRef(callback);
  const isVisible = usePageVisibility();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !isVisible) return;

    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled, isVisible]);
};

/**
 * Pauses media (video/audio) when page is hidden.
 */
export const useMediaVisibility = (
  mediaRef: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>
) => {
  const wasPlayingRef = useRef(false);
  const isVisible = usePageVisibility();

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (!isVisible) {
      wasPlayingRef.current = !media.paused;
      if (!media.paused) media.pause();
    } else if (wasPlayingRef.current) {
      media.play().catch(() => {});
    }
  }, [isVisible, mediaRef]);
};

export default usePageVisibility;
