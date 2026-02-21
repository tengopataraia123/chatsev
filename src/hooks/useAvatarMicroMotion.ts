/**
 * ULTRA AVATAR SYSTEM - AI Micro Motion Hook
 * Lightweight simulated live avatar effects (GPU accelerated)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EmotionState, EMOTION_COLORS, ANIMATION_DURATIONS } from '@/components/avatar/types';

interface MicroMotionState {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
  glowIntensity: number;
  glowColor: string;
}

interface UseMicroMotionOptions {
  enabled?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  emotionState?: EmotionState;
  isVisible?: boolean;
  isTabActive?: boolean;
}

const INTENSITY_MULTIPLIERS = {
  low: 0.3,
  medium: 0.6,
  high: 1.0,
};

/**
 * Generates smooth random motion using Perlin-like noise simulation
 */
function smoothNoise(time: number, frequency: number = 1): number {
  return Math.sin(time * frequency) * 0.5 + 
         Math.sin(time * frequency * 2.3) * 0.3 + 
         Math.sin(time * frequency * 3.7) * 0.2;
}

/**
 * AI Micro Motion Hook
 * Creates lightweight, GPU-accelerated micro-animations for avatars
 */
export function useAvatarMicroMotion(options: UseMicroMotionOptions = {}) {
  const {
    enabled = true,
    intensity = 'medium',
    emotionState = 'idle',
    isVisible = true,
    isTabActive = true,
  } = options;

  const [motionState, setMotionState] = useState<MicroMotionState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0,
    glowIntensity: 0,
    glowColor: EMOTION_COLORS.idle,
  });

  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastEmotionRef = useRef<EmotionState>(emotionState);

  // Calculate motion based on time
  const calculateMotion = useCallback((time: number): MicroMotionState => {
    const multiplier = INTENSITY_MULTIPLIERS[intensity];
    const elapsed = time / 1000; // Convert to seconds

    // Breathing effect - slow, natural rhythm
    const breathingCycle = Math.sin(elapsed * Math.PI * 0.5) * 0.5 + 0.5;
    const breathScale = 1 + breathingCycle * 0.02 * multiplier;

    // Micro head movement - subtle random drift
    const headX = smoothNoise(elapsed * 0.8) * 1.5 * multiplier;
    const headY = smoothNoise(elapsed * 0.6 + 100) * 1 * multiplier;

    // Subtle rotation - very slight tilt
    const rotation = smoothNoise(elapsed * 0.4 + 200) * 0.5 * multiplier;

    // Idle floating motion
    const floatY = Math.sin(elapsed * Math.PI * 0.3) * 2 * multiplier;

    // Glow intensity based on breathing
    const glowIntensity = 0.5 + breathingCycle * 0.3 * multiplier;

    // Emotion-based color
    const glowColor = EMOTION_COLORS[emotionState] || EMOTION_COLORS.idle;

    return {
      scale: breathScale,
      translateX: headX,
      translateY: headY + floatY,
      rotation,
      glowIntensity,
      glowColor,
    };
  }, [intensity, emotionState]);

  // Animation loop
  useEffect(() => {
    if (!enabled || !isVisible || !isTabActive) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Reset to neutral state
      setMotionState({
        scale: 1,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        glowIntensity: 0.5,
        glowColor: EMOTION_COLORS[emotionState],
      });
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newState = calculateMotion(elapsed);
      setMotionState(newState);
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, isVisible, isTabActive, calculateMotion, emotionState]);

  // Emotion change effect - pulse on emotion change
  useEffect(() => {
    if (emotionState !== lastEmotionRef.current) {
      lastEmotionRef.current = emotionState;
      
      // Trigger a brief pulse effect on emotion change
      setMotionState(prev => ({
        ...prev,
        scale: prev.scale * 1.05,
        glowIntensity: 1,
      }));
      
      // Reset after pulse
      const timeout = setTimeout(() => {
        setMotionState(prev => ({
          ...prev,
          scale: 1,
        }));
      }, 200);
      
      return () => clearTimeout(timeout);
    }
  }, [emotionState]);

  // Generate CSS transform string
  const transformStyle = useMemo((): React.CSSProperties => {
    if (!enabled) {
      return {};
    }

    return {
      transform: `
        scale(${motionState.scale}) 
        translate(${motionState.translateX}px, ${motionState.translateY}px) 
        rotate(${motionState.rotation}deg)
      `.trim(),
      transition: 'none', // Use RAF for smooth animation
      willChange: 'transform',
      transformOrigin: 'center center',
    };
  }, [enabled, motionState]);

  // Generate glow style
  const glowStyle = useMemo((): React.CSSProperties => {
    if (!enabled) {
      return {};
    }

    return {
      boxShadow: `0 0 ${20 * motionState.glowIntensity}px ${motionState.glowColor}`,
      transition: 'box-shadow 0.3s ease',
    };
  }, [enabled, motionState.glowIntensity, motionState.glowColor]);

  return {
    motionState,
    transformStyle,
    glowStyle,
    isAnimating: enabled && isVisible && isTabActive,
  };
}

/**
 * Breathing Animation Hook
 * Simple breathing effect without full micro-motion
 */
export function useBreathingAnimation(enabled: boolean = true, duration: number = ANIMATION_DURATIONS.breathing) {
  const [breathPhase, setBreathPhase] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) {
      setBreathPhase(0);
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const phase = (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 2;
      setBreathPhase(phase);
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, duration]);

  const scale = 1 + breathPhase * 0.02;
  const opacity = 0.8 + breathPhase * 0.2;

  return { breathPhase, scale, opacity };
}

/**
 * Floating Animation Hook
 * Smooth floating effect
 */
export function useFloatingAnimation(enabled: boolean = true, amplitude: number = 4) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const x = Math.sin(elapsed * 0.5) * amplitude * 0.3;
      const y = Math.sin(elapsed * 0.3) * amplitude;
      setOffset({ x, y });
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, amplitude]);

  return offset;
}

export default useAvatarMicroMotion;
