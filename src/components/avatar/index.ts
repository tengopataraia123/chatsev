// Main components
export { default as UltraAvatar } from './UltraAvatar';
export { default as AvatarEffectLayer } from './AvatarEffectLayer';
export { default as AvatarVideoLayer } from './AvatarVideoLayer';
export { default as AvatarSettingsPanel } from './AvatarSettingsPanel';

// Types
export * from './types';

// Re-export hooks for convenience
export { useAvatarPerformance, useAnimationPause, getGPUAcceleratedStyle } from '@/hooks/useAvatarPerformance';
export { useAvatarMicroMotion, useBreathingAnimation, useFloatingAnimation } from '@/hooks/useAvatarMicroMotion';
export { useAvatarEmotion, useAvatarActivitySubscription } from '@/hooks/useAvatarEmotion';
export { useAvatarSettings, getCachedAvatarSettings } from '@/hooks/useAvatarSettings';

// Re-export utilities
export { 
  validateAvatarFile, 
  validateVideoDuration, 
  compressAvatarImage, 
  isAnimatedImage,
  stripImageMetadata,
  generateVideoThumbnail,
} from '@/utils/avatarMedia';
