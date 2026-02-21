/**
 * ULTRA AVATAR SYSTEM - Video Layer Component
 * Optimized video avatar with auto-loop and performance controls
 */

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { usePageVisibility } from '@/hooks/usePageVisibility';

interface AvatarVideoLayerProps {
  src: string;
  isVisible?: boolean;
  isTabActive?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  onLoad?: () => void;
  onError?: () => void;
}

const SIZE_CONFIG = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20',
  '3xl': 'w-24 h-24',
};

/**
 * Video Layer Component
 * Renders optimized looping video avatar
 */
const AvatarVideoLayer = memo(({
  src,
  isVisible = true,
  isTabActive = true,
  size = 'md',
  onLoad,
  onError,
}: AvatarVideoLayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isPageActive = usePageVisibility();

  // Play/pause based on visibility and tab state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible && isPageActive && isTabActive && !hasError) {
      video.play().catch(() => {
        // Autoplay blocked - that's ok, we'll try on interaction
      });
    } else {
      video.pause();
    }
  }, [isVisible, isPageActive, isTabActive, hasError]);

  // Handle video load
  const handleLoadedData = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle video error
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
    };
  }, []);

  if (hasError) {
    return null; // Fallback to image avatar
  }

  return (
    <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-background z-10">
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      <video
        ref={videoRef}
        src={src}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          !isLoaded && 'opacity-0'
        )}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        onLoadedData={handleLoadedData}
        onError={handleError}
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      />
    </div>
  );
});

AvatarVideoLayer.displayName = 'AvatarVideoLayer';

export default AvatarVideoLayer;
