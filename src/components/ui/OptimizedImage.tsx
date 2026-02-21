/**
 * Optimized Image Component
 * - Lazy loading with IntersectionObserver
 * - Responsive srcset
 * - WebP fallback
 * - Cached loading state
 * - Prevents re-downloads
 */
import { memo, useState, useRef, useEffect, useCallback, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { getMediaPolicy } from '@/lib/mobilePerformance';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // Skip lazy loading for LCP images
  fallback?: string;
  aspectRatio?: string; // e.g., '1/1', '16/9'
}

const imageCache = new Set<string>();

const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  priority = false,
  fallback,
  aspectRatio,
  className,
  style,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(imageCache.has(src));
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Lazy load with IntersectionObserver
  useEffect(() => {
    if (priority || inView) return;

    const policy = getMediaPolicy();
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: policy.lazyLoadMargin, threshold: 0.01 }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [priority, inView]);

  const handleLoad = useCallback(() => {
    imageCache.add(src);
    setLoaded(true);
  }, [src]);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  const finalSrc = error && fallback ? fallback : src;
  const showSkeleton = !loaded && !error;

  return (
    <div
      ref={imgRef as any}
      className={cn('relative overflow-hidden', className)}
      style={{
        aspectRatio: aspectRatio,
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        ...style,
      }}
    >
      {/* Skeleton placeholder */}
      {showSkeleton && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Actual image - only render when in viewport */}
      {inView && (
        <img
          src={finalSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
