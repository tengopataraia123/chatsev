import { useState, useEffect, useMemo, CSSProperties, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TextStyle {
  text_color: string | null;
  gradient_start: string | null;
  gradient_end: string | null;
  use_gradient: boolean;
  font_weight: string | null;
  font_style: string | null;
  text_decoration: string | null;
  glow_color: string | null;
  glow_intensity: number | null;
  background_color: string | null;
  border_color: string | null;
  border_width: number | null;
  border_radius: number | null;
  animation: string | null;
  font_size: number | null;
  font_family: string | null;
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
const getColorLuminance = (color: string | null): number => {
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
const needsContrastCorrection = (color: string | null, isDarkMode: boolean, customBgLuminance?: number): boolean => {
  if (!color) return false;
  const colorLuminance = getColorLuminance(color);
  
  // If we have a custom background, check contrast against it
  if (customBgLuminance !== undefined) {
    const contrastRatio = Math.abs(colorLuminance - customBgLuminance);
    // If contrast is less than 0.35, need correction
    return contrastRatio < 0.35;
  }
  
  if (isDarkMode) {
    // In dark mode, very dark colors (luminance < 0.15) need correction
    return colorLuminance < 0.15;
  } else {
    // In light mode, very light colors (luminance > 0.85) need correction
    return colorLuminance > 0.85;
  }
};

// Get corrected color for contrast based on background luminance
const getCorrectedColor = (isDarkMode: boolean, customBgLuminance?: number): string => {
  if (customBgLuminance !== undefined) {
    // If background is dark (luminance < 0.5), use white; otherwise use black
    return customBgLuminance < 0.5 ? '#ffffff' : '#000000';
  }
  return isDarkMode ? '#ffffff' : '#000000';
};

// Get luminance from chat background color name
const getChatBgLuminance = (colorName: string | undefined): number | undefined => {
  if (!colorName) return undefined;
  
  const colorMap: Record<string, number> = {
    'night': 0.08,
    'ocean': 0.15,
    'forest': 0.12,
    'wine': 0.14,
    'purple': 0.15,
    'chocolate': 0.12,
    'ash': 0.22,
    'gold': 0.14,
    'slate': 0.14,
    'rose': 0.18,
    'cyan': 0.14,
  };
  
  return colorMap[colorName];
};

// Check if we're in light mode
const isLightMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !document.documentElement.classList.contains('dark');
};

// Cache for user text styles
const styleCache = new Map<string, TextStyle | null>();

interface StyledTextProps {
  userId: string;
  children: ReactNode;
  className?: string;
  chatBackgroundColor?: string;
}

const StyledText = ({ userId, children, className = '', chatBackgroundColor }: StyledTextProps) => {
  const [style, setStyle] = useState<TextStyle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLight, setIsLight] = useState(isLightMode());

  useEffect(() => {
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
    const fetchStyle = async () => {
      if (styleCache.has(userId)) {
        setStyle(styleCache.get(userId) || null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('text_styles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const fetchedStyle = data ? {
        text_color: data.text_color,
        gradient_start: data.gradient_start,
        gradient_end: data.gradient_end,
        use_gradient: data.use_gradient || false,
        font_weight: data.font_weight,
        font_style: data.font_style,
        text_decoration: data.text_decoration,
        glow_color: data.glow_color,
        glow_intensity: data.glow_intensity,
        background_color: data.background_color,
        border_color: data.border_color,
        border_width: data.border_width,
        border_radius: data.border_radius,
        animation: data.animation,
        font_size: data.font_size,
        font_family: data.font_family,
      } : null;

      styleCache.set(userId, fetchedStyle);
      setStyle(fetchedStyle);
      setLoading(false);
    };

    if (userId) {
      fetchStyle();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const computedStyle = useMemo((): CSSProperties => {
    if (!style) return {};

    const baseStyle: CSSProperties = {};

    if (style.font_size) {
      baseStyle.fontSize = `${style.font_size}px`;
    }
    if (style.font_family && style.font_family !== 'default') {
      baseStyle.fontFamily = fontFamilyMap[style.font_family] || 'inherit';
    }
    if (style.font_weight) {
      baseStyle.fontWeight = style.font_weight as any;
    }
    if (style.font_style) {
      baseStyle.fontStyle = style.font_style as any;
    }
    if (style.text_decoration) {
      baseStyle.textDecoration = style.text_decoration;
    }

    const isDarkMode = !isLight;
    const customBgLuminance = getChatBgLuminance(chatBackgroundColor);

    if (style.use_gradient && style.gradient_start && style.gradient_end) {
      // Check if gradient colors need contrast correction
      if (needsContrastCorrection(style.gradient_start, isDarkMode, customBgLuminance) || needsContrastCorrection(style.gradient_end, isDarkMode, customBgLuminance)) {
        baseStyle.color = getCorrectedColor(isDarkMode, customBgLuminance);
      } else {
        baseStyle.background = `linear-gradient(90deg, ${style.gradient_start}, ${style.gradient_end})`;
        baseStyle.WebkitBackgroundClip = 'text';
        baseStyle.WebkitTextFillColor = 'transparent';
        baseStyle.backgroundClip = 'text';
      }
    } else if (style.text_color) {
      // Check if text color needs contrast correction
      if (needsContrastCorrection(style.text_color, isDarkMode, customBgLuminance)) {
        baseStyle.color = getCorrectedColor(isDarkMode, customBgLuminance);
      } else {
        baseStyle.color = style.text_color;
      }
    }

    if (style.glow_color && style.glow_intensity && style.glow_intensity > 0) {
      baseStyle.textShadow = `0 0 ${style.glow_intensity * 2}px ${style.glow_color}, 0 0 ${style.glow_intensity * 4}px ${style.glow_color}`;
    }

    if (style.background_color) {
      baseStyle.backgroundColor = style.background_color;
      baseStyle.padding = '2px 6px';
      baseStyle.borderRadius = `${style.border_radius || 4}px`;
    }

    if (style.border_color && style.border_width && style.border_width > 0) {
      baseStyle.border = `${style.border_width}px solid ${style.border_color}`;
      baseStyle.padding = style.background_color ? '2px 6px' : '1px 4px';
      baseStyle.borderRadius = `${style.border_radius || 4}px`;
    }

    return baseStyle;
  }, [style, isLight, chatBackgroundColor]);

  const animationClass = useMemo(() => {
    if (!style?.animation) return '';
    switch (style.animation) {
      case 'pulse': return 'animate-pulse';
      case 'glow-pulse': return 'animate-glow-pulse';
      default: return '';
    }
  }, [style?.animation]);

  // If no style or loading, just render children
  if (loading || !style) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={`break-words overflow-wrap-anywhere ${className} ${animationClass}`} style={{ ...computedStyle, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
      {children}
    </span>
  );
};

// Function to clear cache for a specific user (call after style update)
export const clearTextStyleCache = (userId: string) => {
  styleCache.delete(userId);
};

export default StyledText;
