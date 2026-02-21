import { memo, useState, useCallback, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // For LCP images - don't lazy load
  aspectRatio?: string; // e.g., "16/9", "1/1", "4/3"
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  onLoad?: () => void;
  onClick?: () => void;
}

/**
 * Optimized Image component for better Core Web Vitals
 * - Prevents CLS with explicit dimensions or aspect ratio
 * - Uses native lazy loading for off-screen images
 * - Uses eager loading for LCP critical images
 * - Handles loading states gracefully
 */
const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  aspectRatio,
  objectFit = 'cover',
  onLoad,
  onClick
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <div 
        className={cn(
          "bg-muted flex items-center justify-center text-muted-foreground",
          className
        )}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '100%',
          aspectRatio: aspectRatio,
        }}
      >
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

  const style: CSSProperties = {
    objectFit,
  };

  if (aspectRatio) {
    style.aspectRatio = aspectRatio;
  }

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : undefined,
        aspectRatio: !height && aspectRatio ? aspectRatio : undefined,
      }}
    >
      {/* Skeleton placeholder - prevents CLS */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{ aspectRatio }}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        className={cn(
          "w-full h-full transition-opacity duration-200",
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={style}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
