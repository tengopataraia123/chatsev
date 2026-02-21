import { memo, forwardRef, useMemo, MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import OwnerAvatarFrame from '@/components/ui/owner-avatar-frame';
import UltraAvatar from '@/components/avatar/UltraAvatar';

export interface UserAvatarProps {
  userId?: string | null;
  src?: string | null;
  username?: string | null;
  gender?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showStoryRing?: boolean;
  enableStoryClick?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  className?: string;
  ringClassName?: string;
  fallbackClassName?: string;
  'aria-label'?: string;
  // NEW: Ultra Avatar features (opt-in)
  enableUltra?: boolean;
  ultraMode?: 'static' | 'animated-image' | 'video' | 'glow-effect' | 'neon-frame' | 'pulse' | 'floating' | 'hybrid';
  effectType?: 'neon-glow' | 'pulse' | 'breathing' | 'gradient-border' | 'soft-aura' | 'rotating-light' | 'fire' | 'energy' | 'shine' | 'rainbow' | null;
  glowColor?: 'blue' | 'green' | 'red' | 'purple' | 'gold' | 'cyan' | 'pink' | 'orange' | 'custom';
  enableMicroMotion?: boolean;
  enableEmotionAvatar?: boolean;
  isOnline?: boolean;
  isTyping?: boolean;
  isPremium?: boolean;
  videoSrc?: string | null;
}

const SIZE_CONFIG = {
  xs: {
    container: 'w-6 h-6',
    avatar: 'w-6 h-6',
    ring: 'w-[30px] h-[30px]',
    ringWidth: '2px',
    gap: '1px',
    text: 'text-[10px]'
  },
  sm: {
    container: 'w-8 h-8',
    avatar: 'w-8 h-8',
    ring: 'w-[36px] h-[36px]',
    ringWidth: '2px',
    gap: '2px',
    text: 'text-xs'
  },
  md: {
    container: 'w-10 h-10',
    avatar: 'w-10 h-10',
    ring: 'w-[46px] h-[46px]',
    ringWidth: '2px',
    gap: '2px',
    text: 'text-sm'
  },
  lg: {
    container: 'w-12 h-12',
    avatar: 'w-12 h-12',
    ring: 'w-[54px] h-[54px]',
    ringWidth: '3px',
    gap: '2px',
    text: 'text-base'
  },
  xl: {
    container: 'w-16 h-16',
    avatar: 'w-16 h-16',
    ring: 'w-[72px] h-[72px]',
    ringWidth: '3px',
    gap: '2px',
    text: 'text-lg'
  },
  '2xl': {
    container: 'w-20 h-20',
    avatar: 'w-20 h-20',
    ring: 'w-[88px] h-[88px]',
    ringWidth: '3px',
    gap: '3px',
    text: 'text-xl'
  }
};

// Male avatar SVG fallback
const MaleAvatarSvg = () => (
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
);

// Female avatar SVG fallback
const FemaleAvatarSvg = () => (
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
);

const UserAvatar = memo(forwardRef<HTMLDivElement, UserAvatarProps>(({
  userId,
  src,
  username,
  gender,
  size = 'md',
  showStoryRing = false, // Disabled - stories removed
  enableStoryClick = false, // Disabled - stories removed
  onClick,
  className,
  ringClassName,
  fallbackClassName,
  'aria-label': ariaLabel,
  // Ultra features
  enableUltra = true,
  ultraMode,
  effectType,
  glowColor,
  enableMicroMotion,
  enableEmotionAvatar,
  isOnline,
  isTyping,
  isPremium,
  videoSrc,
}, ref) => {
  const config = SIZE_CONFIG[size];
  const isFemale = gender === 'female' || gender === 'qali';

  const initials = useMemo(() => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  }, [username]);

  const handleClick = (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    onClick?.(e);
  };

  const isClickable = !!onClick;

  // Render fallback based on gender or initials
  const renderFallback = () => {
    if (gender) {
      return isFemale ? <FemaleAvatarSvg /> : <MaleAvatarSvg />;
    }
    return initials;
  };

  // Check if custom size is provided via className (e.g., w-24 h-24, w-full h-full, w-[120px])
  const hasCustomSize = className && /w-(\d+|full|\[.+\])|h-(\d+|full|\[.+\])/.test(className);

  // If Ultra mode is enabled, render UltraAvatar
  if (enableUltra) {
    return (
      <UltraAvatar
        ref={ref}
        userId={userId}
        src={src}
        videoSrc={videoSrc}
        username={username}
        gender={gender}
        size={size}
        mode={ultraMode || 'static'}
        effectType={effectType}
        glowColor={glowColor || 'blue'}
        enableMicroMotion={enableMicroMotion}
        enableEmotionAvatar={enableEmotionAvatar}
        isOnline={isOnline}
        isTyping={isTyping}
        isPremium={isPremium}
        onClick={onClick}
        className={className}
        fallbackClassName={fallbackClassName}
        aria-label={ariaLabel}
      />
    );
  }
  
  // Standard avatar rendering (backward compatible)
  const avatarContent = (
    <Avatar className={cn(hasCustomSize ? 'w-full h-full' : config.avatar, 'border-2 border-background rounded-full overflow-hidden')}>
      <AvatarImage src={src || undefined} alt={username || 'User avatar'} className="object-cover" />
      <AvatarFallback className={cn(
        gender ? 'p-0 overflow-hidden' : 'bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold',
        config.text,
        fallbackClassName
      )}>
        {renderFallback()}
      </AvatarFallback>
    </Avatar>
  );

  if (isClickable) {
    return (
      <OwnerAvatarFrame username={username} userId={userId}>
        <button
          ref={ref as any}
          type="button"
          onClick={handleClick}
          className={cn(
            'relative rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            config.container,
            className
          )}
          aria-label={ariaLabel || `${username || 'User'} avatar`}
        >
          {avatarContent}
        </button>
      </OwnerAvatarFrame>
    );
  }
  
  return (
    <OwnerAvatarFrame username={username} userId={userId}>
      <div ref={ref} className={cn('relative rounded-full overflow-hidden', config.container, className)}>
        {avatarContent}
      </div>
    </OwnerAvatarFrame>
  );
}));

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
