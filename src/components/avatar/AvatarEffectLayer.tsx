/**
 * ULTRA AVATAR SYSTEM - Effect Layer Component
 * GPU-accelerated visual effects for avatars
 */

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { EffectType } from './types';

interface AvatarEffectLayerProps {
  effectType: EffectType;
  glowColor: string;
  intensity?: number;
  isAnimating?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const SIZE_MULTIPLIERS = {
  xs: 0.5,
  sm: 0.6,
  md: 0.75,
  lg: 1,
  xl: 1.25,
  '2xl': 1.5,
  '3xl': 1.75,
};

/**
 * Effect Layer Component
 * Renders various GPU-accelerated effects around the avatar
 */
const AvatarEffectLayer = memo(({
  effectType,
  glowColor,
  intensity = 1,
  isAnimating = true,
  size = 'md',
}: AvatarEffectLayerProps) => {
  const sizeMultiplier = SIZE_MULTIPLIERS[size];
  
  const effectStyles = useMemo(() => {
    const baseIntensity = intensity * sizeMultiplier;
    
    switch (effectType) {
      case 'neon-glow':
        return {
          className: 'absolute -inset-1 rounded-full pointer-events-none',
          style: {
            boxShadow: `
              0 0 ${10 * baseIntensity}px ${glowColor},
              0 0 ${20 * baseIntensity}px ${glowColor}80,
              0 0 ${30 * baseIntensity}px ${glowColor}40,
              inset 0 0 ${5 * baseIntensity}px ${glowColor}20
            `,
            animation: isAnimating ? 'avatar-neon-pulse 2s ease-in-out infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'pulse':
        return {
          className: 'absolute -inset-2 rounded-full pointer-events-none',
          style: {
            background: `radial-gradient(circle, ${glowColor}30 0%, transparent 70%)`,
            animation: isAnimating ? 'avatar-pulse-effect 2s ease-in-out infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'breathing':
        return {
          className: 'absolute -inset-1 rounded-full pointer-events-none',
          style: {
            boxShadow: `0 0 ${15 * baseIntensity}px ${glowColor}60`,
            animation: isAnimating ? 'avatar-breathing 4s ease-in-out infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'gradient-border':
        return {
          className: 'absolute -inset-1 rounded-full pointer-events-none',
          style: {
            background: `conic-gradient(from 0deg, ${glowColor}, #ff00ff, #00ffff, ${glowColor})`,
            padding: `${3 * sizeMultiplier}px`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            animation: isAnimating ? 'avatar-gradient-spin 4s linear infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'soft-aura':
        return {
          className: 'absolute -inset-3 rounded-full pointer-events-none blur-md',
          style: {
            background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
            animation: isAnimating ? 'avatar-aura-pulse 3s ease-in-out infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'rotating-light':
        return {
          className: 'absolute -inset-2 rounded-full pointer-events-none overflow-hidden',
          style: {
            background: `conic-gradient(from 0deg, transparent 0%, ${glowColor}60 10%, transparent 20%)`,
            animation: isAnimating ? 'avatar-rotate 3s linear infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'fire':
        return {
          className: 'absolute -inset-2 rounded-full pointer-events-none',
          style: {
            background: `
              radial-gradient(ellipse at 50% 100%, #ff4500 0%, transparent 50%),
              radial-gradient(ellipse at 30% 80%, #ff6b00 0%, transparent 40%),
              radial-gradient(ellipse at 70% 80%, #ffa500 0%, transparent 40%)
            `,
            animation: isAnimating ? 'avatar-fire-flicker 0.5s ease-in-out infinite alternate' : 'none',
            filter: 'blur(2px)',
          } as React.CSSProperties,
        };

      case 'energy':
        return {
          className: 'absolute -inset-2 rounded-full pointer-events-none',
          style: {
            background: `
              radial-gradient(circle at 50% 50%, transparent 40%, ${glowColor}80 50%, transparent 60%)
            `,
            animation: isAnimating ? 'avatar-energy-ring 1.5s ease-out infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'shine':
        return {
          className: 'absolute -inset-0 rounded-full pointer-events-none overflow-hidden',
          style: {
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
            animation: isAnimating ? 'avatar-shine-sweep 3s ease-in-out infinite' : 'none',
          } as React.CSSProperties,
        };

      case 'rainbow':
        return {
          className: 'absolute -inset-1 rounded-full pointer-events-none',
          style: {
            background: `conic-gradient(
              from 0deg,
              hsl(0, 100%, 60%),
              hsl(45, 100%, 60%),
              hsl(90, 100%, 60%),
              hsl(135, 100%, 60%),
              hsl(180, 100%, 60%),
              hsl(225, 100%, 60%),
              hsl(270, 100%, 60%),
              hsl(315, 100%, 60%),
              hsl(360, 100%, 60%)
            )`,
            padding: `${3 * sizeMultiplier}px`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            animation: isAnimating ? 'avatar-gradient-spin 3s linear infinite' : 'none',
            filter: `blur(${1 * sizeMultiplier}px)`,
          } as React.CSSProperties,
        };

      default:
        return { className: '', style: {} as React.CSSProperties };
    }
  }, [effectType, glowColor, intensity, isAnimating, sizeMultiplier]);

  if (!effectType) return null;

  return (
    <div
      className={effectStyles.className}
      style={{
        ...effectStyles.style,
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
    />
  );
});

AvatarEffectLayer.displayName = 'AvatarEffectLayer';

export default AvatarEffectLayer;
