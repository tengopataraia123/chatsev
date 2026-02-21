/**
 * ULTRA AVATAR SYSTEM - Type Definitions
 * Future-ready avatar engine for chatsev.ge
 * Version: 2026.1
 */

// ==========================================
// AVATAR MODE TYPES
// ==========================================

export type AvatarMode = 
  | 'static'           // Standard image fallback
  | 'animated-image'   // WEBP/GIF/APNG loop
  | 'video'            // MP4/WEBM 3-5sec loop
  | 'glow-effect'      // GPU accelerated effects
  | 'neon-frame'       // Animated profile ring
  | 'pulse'            // Pulse animation
  | 'floating'         // Smooth floating motion
  | 'hybrid';          // Combined modes

export type EffectType = 
  | 'neon-glow'
  | 'pulse'
  | 'breathing'
  | 'gradient-border'
  | 'soft-aura'
  | 'rotating-light'
  | 'fire'
  | 'energy'
  | 'shine'
  | 'rainbow';

export type EmotionState = 
  | 'idle'
  | 'online'
  | 'typing'
  | 'reacting'
  | 'story-posted'
  | 'mentioned'
  | 'message-received';

export type PerformanceLevel = 'high' | 'medium' | 'low' | 'auto';

export type GlowColor = 
  | 'blue'     // idle
  | 'green'    // online
  | 'red'      // active
  | 'purple'   // reacting
  | 'gold'     // premium
  | 'cyan'
  | 'pink'
  | 'orange'
  | 'custom';

// ==========================================
// AVATAR SETTINGS INTERFACE
// ==========================================

export interface AvatarSettings {
  mode: AvatarMode;
  effectType: EffectType | null;
  glowColor: GlowColor;
  customGlowColor?: string; // HSL format
  animationEnabled: boolean;
  intensity: 'low' | 'medium' | 'high';
  performanceMode: PerformanceLevel;
  emotionAvatarEnabled: boolean;
  autoOptimize: boolean;
  floatingEnabled: boolean;
  microMotionEnabled: boolean;
}

export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = {
  mode: 'static',
  effectType: null,
  glowColor: 'blue',
  animationEnabled: true,
  intensity: 'medium',
  performanceMode: 'auto',
  emotionAvatarEnabled: true,
  autoOptimize: true,
  floatingEnabled: false,
  microMotionEnabled: false,
};

// ==========================================
// AVATAR MEDIA TYPES
// ==========================================

export interface AvatarMedia {
  type: 'image' | 'animated-image' | 'video';
  url: string;
  thumbnailUrl?: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // For video
}

export const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'apng'];
export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'webm'];
export const ANIMATED_IMAGE_FORMATS = ['gif', 'webp', 'apng'];

export const AVATAR_LIMITS = {
  maxImageSize: 2 * 1024 * 1024, // 2MB
  maxVideoSize: 1.5 * 1024 * 1024, // 1.5MB
  maxVideoDuration: 5, // seconds
  outputSize: 256, // px
  maxUploadSize: 10 * 1024 * 1024, // 10MB before compression
};

// ==========================================
// PERFORMANCE CONFIG
// ==========================================

export interface PerformanceConfig {
  fps: number;
  enableGPU: boolean;
  enableAnimations: boolean;
  enableEffects: boolean;
  enableMicroMotion: boolean;
  enableFloating: boolean;
  reduceMotion: boolean;
}

export const PERFORMANCE_PRESETS: Record<PerformanceLevel, Omit<PerformanceConfig, 'fps'>> = {
  high: {
    enableGPU: true,
    enableAnimations: true,
    enableEffects: true,
    enableMicroMotion: true,
    enableFloating: true,
    reduceMotion: false,
  },
  medium: {
    enableGPU: true,
    enableAnimations: true,
    enableEffects: true,
    enableMicroMotion: false,
    enableFloating: false,
    reduceMotion: false,
  },
  low: {
    enableGPU: false,
    enableAnimations: false,
    enableEffects: false,
    enableMicroMotion: false,
    enableFloating: false,
    reduceMotion: true,
  },
  auto: {
    enableGPU: true,
    enableAnimations: true,
    enableEffects: true,
    enableMicroMotion: true,
    enableFloating: true,
    reduceMotion: false,
  },
};

// ==========================================
// EMOTION COLOR MAPPING
// ==========================================

export const EMOTION_COLORS: Record<EmotionState, string> = {
  'idle': 'hsl(210, 100%, 60%)',      // Blue
  'online': 'hsl(142, 76%, 50%)',      // Green
  'typing': 'hsl(270, 100%, 65%)',     // Purple
  'reacting': 'hsl(280, 100%, 65%)',   // Purple
  'story-posted': 'hsl(330, 100%, 60%)', // Pink
  'mentioned': 'hsl(45, 100%, 60%)',   // Gold
  'message-received': 'hsl(200, 100%, 60%)', // Cyan
};

export const GLOW_COLORS: Record<GlowColor, string> = {
  'blue': 'hsl(210, 100%, 60%)',
  'green': 'hsl(142, 76%, 50%)',
  'red': 'hsl(0, 85%, 60%)',
  'purple': 'hsl(270, 100%, 65%)',
  'gold': 'hsl(45, 100%, 55%)',
  'cyan': 'hsl(185, 100%, 55%)',
  'pink': 'hsl(330, 100%, 65%)',
  'orange': 'hsl(25, 100%, 55%)',
  'custom': 'hsl(210, 100%, 60%)',
};

// ==========================================
// PREMIUM FEATURES (FUTURE READY)
// ==========================================

export interface PremiumAvatarFeatures {
  animatedFrames: boolean;
  exclusiveGlowColors: boolean;
  videoAvatar: boolean;
  animatedGradientBorders: boolean;
  goldenAura: boolean;
  vipBadge: boolean;
  customEffects: boolean;
  priority3DRendering: boolean; // Future
  nftAvatarSupport: boolean;    // Future
  liveCamera: boolean;          // Future
  aiGenerated: boolean;         // Future
}

export const FREE_FEATURES: PremiumAvatarFeatures = {
  animatedFrames: false,
  exclusiveGlowColors: false,
  videoAvatar: false,
  animatedGradientBorders: false,
  goldenAura: false,
  vipBadge: false,
  customEffects: false,
  priority3DRendering: false,
  nftAvatarSupport: false,
  liveCamera: false,
  aiGenerated: false,
};

export const VIP_FEATURES: PremiumAvatarFeatures = {
  animatedFrames: true,
  exclusiveGlowColors: true,
  videoAvatar: true,
  animatedGradientBorders: true,
  goldenAura: true,
  vipBadge: true,
  customEffects: true,
  priority3DRendering: false,
  nftAvatarSupport: false,
  liveCamera: false,
  aiGenerated: false,
};

// ==========================================
// COMPONENT PROPS
// ==========================================

export interface UltraAvatarProps {
  // Core props
  userId?: string | null;
  src?: string | null;
  videoSrc?: string | null;
  username?: string | null;
  gender?: string | null;
  
  // Size
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  
  // Mode & Effects
  mode?: AvatarMode;
  effectType?: EffectType | null;
  glowColor?: GlowColor;
  customGlowColor?: string;
  
  // Features
  enableAnimation?: boolean;
  enableEffects?: boolean;
  enableMicroMotion?: boolean;
  enableFloating?: boolean;
  enableEmotionAvatar?: boolean;
  
  // Emotion state
  emotionState?: EmotionState;
  isOnline?: boolean;
  isTyping?: boolean;
  
  // Performance
  performanceLevel?: PerformanceLevel;
  priority?: boolean; // Disable lazy load for important avatars
  
  // Premium
  isPremium?: boolean;
  showVipBadge?: boolean;
  
  // Events
  onClick?: (e: React.MouseEvent) => void;
  onLoad?: () => void;
  onError?: () => void;
  
  // Styling
  className?: string;
  ringClassName?: string;
  fallbackClassName?: string;
  
  // Accessibility
  'aria-label'?: string;
}

// ==========================================
// ANIMATION KEYFRAMES CONFIG
// ==========================================

export const ANIMATION_DURATIONS = {
  breathing: 4000,
  pulse: 2000,
  floating: 6000,
  glow: 3000,
  rotate: 8000,
  microMotion: 5000,
};

export const ANIMATION_EASINGS = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  natural: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
};
