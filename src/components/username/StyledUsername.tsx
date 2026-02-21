import { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import VipBadge from '@/components/vip/VipBadge';
import VerifiedBadge from '@/components/verified/VerifiedBadge';
import { isOwner, isOwnerById, OWNER_USERNAME_DISPLAY } from '@/utils/ownerUtils';


interface UsernameStyle {
  text_color: string;
  gradient_start: string | null;
  gradient_end: string | null;
  use_gradient: boolean;
  font_weight: string;
  font_style: string;
  text_decoration: string;
  text_shadow: string | null;
  glow_color: string | null;
  glow_intensity: number;
  background_color: string | null;
  border_color: string | null;
  border_width: number;
  border_radius: number;
  animation: string;
  prefix_emoji: string | null;
  suffix_emoji: string | null;
  font_size?: number;
  font_family?: string;
}

const fontFamilyMap: Record<string, string> = {
  'default': 'inherit',
  'roboto': '"Roboto", sans-serif',
  'open-sans': '"Open Sans", sans-serif',
  'lato': '"Lato", sans-serif',
  'montserrat': '"Montserrat", sans-serif',
  'poppins': '"Poppins", sans-serif',
  'playfair': '"Playfair Display", serif',
  'oswald': '"Oswald", sans-serif',
  'raleway': '"Raleway", sans-serif',
};

// Function to get color luminance (0 = black, 1 = white)
const getColorLuminance = (color: string): number => {
  if (!color) return 0.5;
  
  let r = 128, g = 128, b = 128;
  
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0]);
      g = parseInt(match[1]);
      b = parseInt(match[2]);
    }
  } else if (color === 'white' || color === '#fff' || color === '#ffffff') {
    return 1;
  } else if (color === 'black' || color === '#000' || color === '#000000') {
    return 0;
  }
  
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

// Check if color needs contrast correction based on theme or custom background
const needsContrastCorrection = (color: string, isDarkMode: boolean, customBgLuminance?: number): boolean => {
  const colorLuminance = getColorLuminance(color);
  
  // If we have a custom background, check contrast against it
  if (customBgLuminance !== undefined) {
    const contrastRatio = Math.abs(colorLuminance - customBgLuminance);
    return contrastRatio < 0.35;
  }
  
  if (isDarkMode) {
    return colorLuminance < 0.15;
  } else {
    return colorLuminance > 0.85;
  }
};

// Get corrected color for contrast
const getCorrectedColor = (isDarkMode: boolean, customBgLuminance?: number): string => {
  if (customBgLuminance !== undefined) {
    return customBgLuminance < 0.5 ? '#ffffff' : '#000000';
  }
  return isDarkMode ? '#ffffff' : '#000000';
};

// Get luminance from chat background color name
const getChatBgLuminance = (colorName: string | undefined): number | undefined => {
  if (!colorName) return undefined;
  const colorMap: Record<string, number> = {
    'night': 0.08, 'ocean': 0.15, 'forest': 0.12, 'wine': 0.14, 'purple': 0.15,
    'chocolate': 0.12, 'ash': 0.22, 'gold': 0.14, 'slate': 0.14, 'rose': 0.18, 'cyan': 0.14,
  };
  return colorMap[colorName];
};

// Check if we're in light mode
const isLightMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !document.documentElement.classList.contains('dark');
};

interface PrefetchedUserData {
  style: UsernameStyle | null;
  vipType: string | null;
  isVerified: boolean;
}

interface StyledUsernameProps {
  userId: string;
  username: string;
  className?: string;
  onClick?: () => void;
  style?: UsernameStyle | null;
  showVipBadge?: boolean;
  showVerifiedBadge?: boolean;
  isVerified?: boolean;
  chatBackgroundColor?: string;
  /** Pre-fetched data from batch hook - skips individual API calls */
  prefetchedData?: PrefetchedUserData;
}

const StyledUsername = ({ userId, username, className = '', onClick, style: propStyle, showVipBadge = true, showVerifiedBadge = true, isVerified: propIsVerified, chatBackgroundColor, prefetchedData }: StyledUsernameProps) => {
  // Use prefetched data if available, otherwise use local state
  const [style, setStyle] = useState<UsernameStyle | null>(prefetchedData?.style ?? propStyle ?? null);
  const [loading, setLoading] = useState(!prefetchedData && !propStyle);
  const [vipType, setVipType] = useState<string | null>(prefetchedData?.vipType ?? null);
  const [isVerified, setIsVerified] = useState<boolean>(prefetchedData?.isVerified ?? propIsVerified ?? false);
  const [isLight, setIsLight] = useState(isLightMode());

  useEffect(() => {
    // Listen for theme changes
    const observer = new MutationObserver(() => {
      setIsLight(isLightMode());
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // If prefetched data is provided, use it directly - NO API CALLS NEEDED
    if (prefetchedData) {
      setStyle(prefetchedData.style);
      setVipType(prefetchedData.vipType);
      setIsVerified(prefetchedData.isVerified);
      setLoading(false);
      return;
    }
    
    if (propStyle) {
      setStyle(propStyle);
      return;
    }
    
    // Skip fetching if userId is empty or invalid
    if (!userId || userId.trim() === '') {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      // Fetch style
      const { data: styleData } = await supabase
        .from('username_styles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      setStyle(styleData as UsernameStyle | null);

      // Fetch VIP status and verified status
      if (showVipBadge || showVerifiedBadge) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profileData && showVerifiedBadge && propIsVerified === undefined) {
          setIsVerified(profileData.is_verified || false);
        }

        if (showVipBadge) {
          const { data: vipData } = await supabase
            .from('vip_purchases')
            .select('vip_type')
            .eq('user_id', userId)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          setVipType(vipData?.vip_type || null);
        }
      }
      
      setLoading(false);
    };

    fetchData();
  }, [userId, propStyle, showVipBadge, prefetchedData]);

  const computedStyle = useMemo(() => {
    if (!style) return {};

    const baseStyle: React.CSSProperties = {
      fontWeight: style.font_weight as any,
      fontStyle: style.font_style as any,
      textDecoration: style.text_decoration,
      fontSize: style.font_size ? `${style.font_size}px` : undefined,
      fontFamily: style.font_family ? fontFamilyMap[style.font_family] || 'inherit' : undefined,
    };

    const isDarkMode = !isLight;
    const customBgLuminance = getChatBgLuminance(chatBackgroundColor);
    
    if (style.use_gradient && style.gradient_start && style.gradient_end) {
      if (needsContrastCorrection(style.gradient_start, isDarkMode, customBgLuminance) || needsContrastCorrection(style.gradient_end, isDarkMode, customBgLuminance)) {
        baseStyle.color = getCorrectedColor(isDarkMode, customBgLuminance);
      } else {
        baseStyle.background = `linear-gradient(90deg, ${style.gradient_start}, ${style.gradient_end})`;
        baseStyle.WebkitBackgroundClip = 'text';
        baseStyle.WebkitTextFillColor = 'transparent';
        baseStyle.backgroundClip = 'text';
      }
    } else {
      if (needsContrastCorrection(style.text_color, isDarkMode, customBgLuminance)) {
        baseStyle.color = getCorrectedColor(isDarkMode, customBgLuminance);
      } else {
        baseStyle.color = style.text_color;
      }
    }

    if (style.glow_color && style.glow_intensity > 0) {
      const intensity = style.glow_intensity;
      baseStyle.textShadow = `0 0 ${intensity * 2}px ${style.glow_color}, 0 0 ${intensity * 4}px ${style.glow_color}`;
    } else if (style.text_shadow) {
      baseStyle.textShadow = style.text_shadow;
    }

    if (style.background_color) {
      baseStyle.backgroundColor = style.background_color;
      baseStyle.padding = '2px 8px';
      baseStyle.borderRadius = `${style.border_radius}px`;
    }

    if (style.border_color && style.border_width > 0) {
      baseStyle.border = `${style.border_width}px solid ${style.border_color}`;
      baseStyle.padding = style.background_color ? '2px 8px' : '1px 6px';
      baseStyle.borderRadius = `${style.border_radius}px`;
    }

    return baseStyle;
  }, [style, isLight, chatBackgroundColor]);

  const animationClass = useMemo(() => {
    if (!style?.animation || style.animation === 'none') return '';
    
    switch (style.animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'bounce':
        return 'animate-bounce';
      case 'shake':
        return 'animate-shake';
      case 'glow-pulse':
        return 'animate-glow-pulse';
      case 'rainbow':
        return 'animate-rainbow';
      case 'typing':
        return 'animate-typing';
      default:
        return '';
    }
  }, [style?.animation]);

  const isOwnerUser = useMemo(() => {
    return isOwner(username) || isOwnerById(userId);
  }, [username, userId]);

  if (loading) {
    return <span className={className}>{username}</span>;
  }

  // Owner gets special styling - always show crown and gold gradient with spaced name
  if (isOwnerUser) {
    return (
      <span 
        className={`inline-flex items-center gap-1 max-w-full overflow-hidden ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'inherit' }}
      >
        {showVipBadge && vipType && <VipBadge vipType={vipType} size="sm" />}
        {showVerifiedBadge && isVerified && <VerifiedBadge size="sm" />}
        <span className="flex-shrink-0 text-amber-400">👑</span>
        <span className="owner-username-gradient font-bold italic text-[1.1em] tracking-wider">{OWNER_USERNAME_DISPLAY}</span>
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 max-w-full overflow-hidden ${animationClass} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'inherit' }}
    >
      {showVipBadge && vipType && <VipBadge vipType={vipType} size="sm" />}
      {showVerifiedBadge && isVerified && <VerifiedBadge size="sm" />}
      {style?.prefix_emoji && <span className="flex-shrink-0">{style.prefix_emoji}</span>}
      <span style={computedStyle} className="truncate">{username}</span>
      {style?.suffix_emoji && <span className="flex-shrink-0">{style.suffix_emoji}</span>}
    </span>
  );
};

StyledUsername.displayName = 'StyledUsername';

export default memo(StyledUsername);
