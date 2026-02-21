import { useEffect, useCallback, useRef } from 'react';
import { isMobileDevice } from './useIsMobile';

/**
 * Hook for mobile-specific optimizations
 * Handles touch interactions, viewport stability, and performance enhancements
 */
export const useMobileOptimization = () => {
  const touchStartYRef = useRef(0);

  // Prevent pull-to-refresh when in specific components
  const preventPullToRefresh = useCallback((element: HTMLElement | null) => {
    if (!element || !isMobileDevice()) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const scrollTop = element.scrollTop;
      
      // Prevent pull-to-refresh when at top and pulling down
      if (scrollTop <= 0 && touchY > touchStartYRef.current) {
        e.preventDefault();
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Fix iOS viewport height issues (100vh problem)
  useEffect(() => {
    if (!isMobileDevice()) return;

    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);

    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // Prevent zoom on input focus (iOS)
  useEffect(() => {
    if (!isMobileDevice()) return;

    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      const content = viewport.getAttribute('content') || '';
      if (!content.includes('maximum-scale')) {
        viewport.setAttribute('content', content + ', maximum-scale=1.0');
      }
    }
  }, []);

  return {
    preventPullToRefresh,
    isMobile: isMobileDevice(),
  };
};

/**
 * Hook to stop video playback when component unmounts or when leaving view
 */
export const useVideoCleanup = (videoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement | null }>) => {
  useEffect(() => {
    return () => {
      // Stop all videos on unmount
      Object.values(videoRefs.current).forEach(video => {
        if (video) {
          video.pause();
          video.muted = true;
          video.currentTime = 0;
        }
      });
    };
  }, [videoRefs]);

  const stopAllVideos = useCallback(() => {
    Object.values(videoRefs.current).forEach(video => {
      if (video) {
        video.pause();
        video.muted = true;
        video.currentTime = 0;
      }
    });
  }, [videoRefs]);

  const stopVideoById = useCallback((id: string) => {
    const video = videoRefs.current[id];
    if (video) {
      video.pause();
      video.muted = true;
      video.currentTime = 0;
    }
  }, [videoRefs]);

  return {
    stopAllVideos,
    stopVideoById,
  };
};

/**
 * Hook for optimized scroll handling on mobile
 */
export const useMobileScroll = (onScrollEnd?: () => void) => {
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      onScrollEnd?.();
    }, 150); // Debounce scroll end detection
  }, [onScrollEnd]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleScroll,
    isScrolling: isScrollingRef.current,
  };
};

/**
 * Utility function to check if touch device
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Utility function to get safe area insets
 */
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) || 0,
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) || 0,
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) || 0,
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) || 0,
  };
};

export default useMobileOptimization;
