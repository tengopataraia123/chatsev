/**
 * ULTRA AVATAR SYSTEM - Main Component
 * Future-ready multi-type avatar with AI micro-motion and emotion effects
 * Full backward compatibility with existing UserAvatar
 */

import { memo, forwardRef, useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import OwnerAvatarFrame from '@/components/ui/owner-avatar-frame';
import { 
  UltraAvatarProps, 
  AvatarMode,
  GLOW_COLORS,
  DEFAULT_AVATAR_SETTINGS,
} from './types';
import { useAvatarPerformance, getGPUAcceleratedStyle } from '@/hooks/useAvatarPerformance';
import { useAvatarMicroMotion } from '@/hooks/useAvatarMicroMotion';
import { useAvatarEmotion } from '@/hooks/useAvatarEmotion';
import AvatarEffectLayer from './AvatarEffectLayer';
import AvatarVideoLayer from './AvatarVideoLayer';

// Size configurations
const SIZE_CONFIG = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', ring: 2, glow: 8 },
  sm: { container: 'w-8 h-8', text: 'text-xs', ring: 2, glow: 10 },
  md: { container: 'w-10 h-10', text: 'text-sm', ring: 2, glow: 12 },
  lg: { container: 'w-12 h-12', text: 'text-base', ring: 3, glow: 16 },
  xl: { container: 'w-16 h-16', text: 'text-lg', ring: 3, glow: 20 },
  '2xl': { container: 'w-20 h-20', text: 'text-xl', ring: 4, glow: 24 },
  '3xl': { container: 'w-24 h-24', text: 'text-2xl', ring: 4, glow: 30 },
};

// Male avatar SVG fallback
const MaleAvatarSvg = memo(() => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <linearGradient id="maleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a8c8e8" />
        <stop offset="50%" stopColor="#d4c4d8" />
        <stop offset="100%" stopColor="#e8d8c8" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#maleGradient)" />
    <ellipse cx="50" cy="38" rx="16" ry="18" fill="white" fillOpacity="0.95" />
    <path d="M34 32 Q34 20 50 18 Q66 20 66 32 Q66 26 50 24 Q34 26 34 32" fill="white" fillOpacity="0.95" />
    <path d="M25 85 Q25 62 50 58 Q75 62 75 85 L75 100 L25 100 Z" fill="white" fillOpacity="0.95" />
    <rect x="42" y="54" width="16" height="8" rx="2" fill="white" fillOpacity="0.95" />
  </svg>
));
MaleAvatarSvg.displayName = 'MaleAvatarSvg';

// Female avatar SVG fallback
const FemaleAvatarSvg = memo(() => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <linearGradient id="femaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a8c8e8" />
        <stop offset="50%" stopColor="#d4c4d8" />
        <stop offset="100%" stopColor="#e8d8c8" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#femaleGradient)" />
    <ellipse cx="50" cy="38" rx="14" ry="17" fill="white" fillOpacity="0.95" />
    <path d="M28 40 Q28 15 50 14 Q72 15 72 40 L72 55 Q68 45 64 52 Q60 30 50 28 Q40 30 36 52 Q32 45 28 55 Z" fill="white" fillOpacity="0.95" />
    <path d="M30 48 Q22 58 24 72" stroke="white" strokeOpacity="0.95" strokeWidth="10" fill="none" strokeLinecap="round" />
    <path d="M70 48 Q78 58 76 72" stroke="white" strokeOpacity="0.95" strokeWidth="10" fill="none" strokeLinecap="round" />
    <path d="M28 85 Q28 65 50 60 Q72 65 72 85 L72 100 L28 100 Z" fill="white" fillOpacity="0.95" />
    <rect x="44" y="54" width="12" height="8" rx="2" fill="white" fillOpacity="0.95" />
  </svg>
));
FemaleAvatarSvg.displayName = 'FemaleAvatarSvg';

/**
 * ULTRA AVATAR - Main Component
 */
// Auto-detect video URLs
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.wmv', '.ogv'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
};

const UltraAvatar = memo(forwardRef<HTMLDivElement, UltraAvatarProps>(({
  userId,
  src,
  videoSrc,
  username,
  gender,
  size = 'md',
  mode = 'static',
  effectType = null,
  glowColor = 'blue',
  customGlowColor,
  enableAnimation = true,
  enableEffects = true,
  enableMicroMotion = false,
  enableFloating = false,
  enableEmotionAvatar = true,
  emotionState: externalEmotionState,
  isOnline = false,
  isTyping = false,
  performanceLevel = 'auto',
  priority = false,
  isPremium = false,
  showVipBadge = false,
  onClick,
  onLoad,
  onError,
  className,
  ringClassName,
  fallbackClassName,
  'aria-label': ariaLabel,
}, ref) => {
  // Auto-detect if src is a video URL and use it as videoSrc
  const isSourceVideo = isVideoUrl(src);
  const resolvedVideoSrc = videoSrc || (isSourceVideo ? src : null);
  const resolvedMode = isSourceVideo && !videoSrc ? 'video' : mode;
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const config = SIZE_CONFIG[size];
  const isFemale = gender === 'female' || gender === 'qali';
  const resolvedGlowColor = customGlowColor || GLOW_COLORS[glowColor];

  // Performance system
  const { 
    performanceConfig, 
    isTabActive, 
    shouldAnimate, 
    shouldRenderEffects,
  } = useAvatarPerformance({ preferredLevel: performanceLevel });

  // Viewport visibility for lazy animation
  const [isVisible, setIsVisible] = useState(priority);
  
  useEffect(() => {
    if (priority || !containerRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '50px' }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  // Emotion system
  const {
    emotionState: internalEmotionState,
    emotionStyles,
    currentEmotion,
  } = useAvatarEmotion({
    enabled: enableEmotionAvatar && enableEffects,
    userId,
    isOnline,
    isTyping,
  });

  const activeEmotionState = externalEmotionState || currentEmotion;

  // Micro motion system
  const {
    transformStyle: microMotionStyle,
    glowStyle: microGlowStyle,
    isAnimating,
  } = useAvatarMicroMotion({
    enabled: enableMicroMotion && shouldAnimate(priority) && isVisible,
    intensity: performanceConfig.enableMicroMotion ? 'medium' : 'low',
    emotionState: activeEmotionState,
    isVisible,
    isTabActive,
  });

  // Determine actual mode based on availability (auto-detect video URLs)
  const actualMode = useMemo((): AvatarMode => {
    if (resolvedVideoSrc && (resolvedMode === 'video' || isSourceVideo)) return 'video';
    if (!shouldAnimate(priority)) return 'static';
    return resolvedMode;
  }, [resolvedVideoSrc, resolvedMode, isSourceVideo, shouldAnimate, priority]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleImageError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate initials
  const initials = useMemo(() => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  }, [username]);

  // Render fallback
  const renderFallback = useCallback(() => {
    if (gender) {
      return isFemale ? <FemaleAvatarSvg /> : <MaleAvatarSvg />;
    }
    return initials;
  }, [gender, isFemale, initials]);

  // Combined styles for animation
  const animatedContainerStyle = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {
      ...getGPUAcceleratedStyle(),
    };

    if (enableMicroMotion && isAnimating) {
      Object.assign(styles, microMotionStyle);
    }

    return styles;
  }, [enableMicroMotion, isAnimating, microMotionStyle]);

  // Glow ring styles
  const glowRingStyle = useMemo((): React.CSSProperties => {
    if (!enableEffects || !shouldRenderEffects(priority)) {
      return {};
    }

    const glowSize = config.glow;
    const color = emotionStyles.boxShadow 
      ? internalEmotionState.glowColor 
      : resolvedGlowColor;

    return {
      boxShadow: `0 0 ${glowSize}px ${color}, 0 0 ${glowSize * 2}px ${color}40`,
      transition: 'box-shadow 0.3s ease',
    };
  }, [enableEffects, shouldRenderEffects, priority, config.glow, emotionStyles, internalEmotionState.glowColor, resolvedGlowColor]);

  // Check custom size in className
  const hasCustomSize = className && /w-(\d+|full|\[.+\])|h-(\d+|full|\[.+\])/.test(className);

  // Avatar content
  const avatarContent = (
    <div 
      className={cn(
        'relative rounded-full overflow-hidden',
        hasCustomSize ? 'w-full h-full' : config.container
      )}
      style={animatedContainerStyle}
    >
      {/* Effect layer (glow, neon, pulse, etc.) */}
      {enableEffects && shouldRenderEffects(priority) && effectType && (
        <AvatarEffectLayer
          effectType={effectType}
          glowColor={resolvedGlowColor}
          intensity={performanceConfig.enableEffects ? 1 : 0.5}
          isAnimating={shouldAnimate(priority) && isVisible}
          size={size}
        />
      )}

      {/* Emotion glow ring */}
      {enableEmotionAvatar && (isOnline || isTyping) && (
        <div 
          className="absolute -inset-1 rounded-full pointer-events-none"
          style={glowRingStyle}
        />
      )}

      {/* Video layer */}
      {actualMode === 'video' && resolvedVideoSrc && (
        <AvatarVideoLayer
          src={resolvedVideoSrc}
          isVisible={isVisible}
          isTabActive={isTabActive}
          size={size}
        />
      )}

      {/* Image avatar */}
      {actualMode !== 'video' && (
        <Avatar className={cn(
          hasCustomSize ? 'w-full h-full' : config.container, 
          'border-2 border-background relative z-10'
        )}>
          <AvatarImage 
            src={src || undefined} 
            alt={username || 'User avatar'} 
            className="object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <AvatarFallback className={cn(
            gender ? 'p-0 overflow-hidden' : 'bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold',
            config.text,
            fallbackClassName
          )}>
            {renderFallback()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* VIP badge */}
      {showVipBadge && isPremium && (
        <div className="absolute -bottom-0.5 -right-0.5 z-20">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <span className="text-[8px] font-bold text-primary-foreground">★</span>
          </div>
        </div>
      )}

      {/* Online indicator */}
      {isOnline && !isTyping && (
        <div className="absolute bottom-0 right-0 z-20">
          <div className={cn(
            'rounded-full bg-emerald-500 border-2 border-background',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
            shouldAnimate(priority) && 'animate-pulse'
          )} />
        </div>
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="absolute bottom-0 right-0 z-20">
          <div className={cn(
            'rounded-full bg-primary border-2 border-background flex items-center justify-center',
            size === 'xs' || size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          )}>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Clickable wrapper
  if (onClick) {
    return (
      <OwnerAvatarFrame username={username} userId={userId}>
        <button
          ref={ref as any}
          type="button"
          onClick={onClick}
          className={cn(
            'relative rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            hasCustomSize ? '' : config.container,
            className
          )}
          aria-label={ariaLabel || `${username || 'User'} avatar`}
        >
          <div ref={containerRef} className="rounded-full overflow-hidden">
            {avatarContent}
          </div>
        </button>
      </OwnerAvatarFrame>
    );
  }

  return (
    <OwnerAvatarFrame username={username} userId={userId}>
      <div 
        ref={(el) => {
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
          containerRef.current = el;
        }}
        className={cn('relative rounded-full overflow-hidden', hasCustomSize ? '' : config.container, className)}
      >
        {avatarContent}
      </div>
    </OwnerAvatarFrame>
  );
}));

UltraAvatar.displayName = 'UltraAvatar';

export default UltraAvatar;
