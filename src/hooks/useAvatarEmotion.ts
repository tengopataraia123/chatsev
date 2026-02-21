/**
 * ULTRA AVATAR SYSTEM - Emotion Avatar Hook
 * Reactive avatar effects based on user activity
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EmotionState, EMOTION_COLORS } from '@/components/avatar/types';

interface EmotionEvent {
  type: EmotionState;
  timestamp: number;
  duration?: number;
}

interface UseAvatarEmotionOptions {
  enabled?: boolean;
  userId?: string | null;
  isOnline?: boolean;
  isTyping?: boolean;
  onEmotionChange?: (emotion: EmotionState) => void;
}

interface EmotionAnimationState {
  currentEmotion: EmotionState;
  glowColor: string;
  pulseActive: boolean;
  ringAnimation: 'none' | 'glow' | 'pulse' | 'typing' | 'story';
  intensity: number;
}

/**
 * Emotion Avatar Hook
 * Manages avatar reactions based on user activity
 */
export function useAvatarEmotion(options: UseAvatarEmotionOptions = {}) {
  const {
    enabled = true,
    userId,
    isOnline = false,
    isTyping = false,
    onEmotionChange,
  } = options;

  const [emotionState, setEmotionState] = useState<EmotionAnimationState>({
    currentEmotion: 'idle',
    glowColor: EMOTION_COLORS.idle,
    pulseActive: false,
    ringAnimation: 'none',
    intensity: 0.5,
  });

  const eventQueueRef = useRef<EmotionEvent[]>([]);
  const processingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process emotion event queue
  const processQueue = useCallback(() => {
    if (processingRef.current || eventQueueRef.current.length === 0) return;
    
    processingRef.current = true;
    const event = eventQueueRef.current.shift()!;
    
    setEmotionState(prev => ({
      ...prev,
      currentEmotion: event.type,
      glowColor: EMOTION_COLORS[event.type],
      pulseActive: true,
      ringAnimation: getAnimationForEmotion(event.type),
      intensity: getIntensityForEmotion(event.type),
    }));
    
    onEmotionChange?.(event.type);
    
    // Reset pulse after duration
    const duration = event.duration || 2000;
    timeoutRef.current = setTimeout(() => {
      setEmotionState(prev => ({
        ...prev,
        pulseActive: false,
        ringAnimation: isOnline ? 'glow' : 'none',
        intensity: 0.5,
      }));
      processingRef.current = false;
      processQueue();
    }, duration);
  }, [isOnline, onEmotionChange]);

  // Queue emotion event
  const triggerEmotion = useCallback((type: EmotionState, duration?: number) => {
    if (!enabled) return;
    
    eventQueueRef.current.push({
      type,
      timestamp: Date.now(),
      duration,
    });
    
    processQueue();
  }, [enabled, processQueue]);

  // Handle online status change
  useEffect(() => {
    if (!enabled) return;
    
    if (isOnline) {
      setEmotionState(prev => ({
        ...prev,
        currentEmotion: 'online',
        glowColor: EMOTION_COLORS.online,
        ringAnimation: 'glow',
        intensity: 0.6,
      }));
    } else {
      setEmotionState(prev => ({
        ...prev,
        currentEmotion: 'idle',
        glowColor: EMOTION_COLORS.idle,
        ringAnimation: 'none',
        intensity: 0.3,
      }));
    }
  }, [enabled, isOnline]);

  // Handle typing status
  useEffect(() => {
    if (!enabled) return;
    
    if (isTyping) {
      setEmotionState(prev => ({
        ...prev,
        currentEmotion: 'typing',
        glowColor: EMOTION_COLORS.typing,
        ringAnimation: 'typing',
        pulseActive: true,
        intensity: 0.8,
      }));
    } else if (emotionState.currentEmotion === 'typing') {
      // Return to previous state
      setEmotionState(prev => ({
        ...prev,
        currentEmotion: isOnline ? 'online' : 'idle',
        glowColor: isOnline ? EMOTION_COLORS.online : EMOTION_COLORS.idle,
        ringAnimation: isOnline ? 'glow' : 'none',
        pulseActive: false,
        intensity: isOnline ? 0.6 : 0.3,
      }));
    }
  }, [enabled, isTyping, isOnline, emotionState.currentEmotion]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Message received trigger
  const onMessageReceived = useCallback(() => {
    triggerEmotion('message-received', 1500);
  }, [triggerEmotion]);

  // Reaction trigger
  const onReaction = useCallback(() => {
    triggerEmotion('reacting', 1000);
  }, [triggerEmotion]);

  // Story posted trigger
  const onStoryPosted = useCallback(() => {
    triggerEmotion('story-posted', 3000);
  }, [triggerEmotion]);

  // Mentioned trigger
  const onMentioned = useCallback(() => {
    triggerEmotion('mentioned', 2000);
  }, [triggerEmotion]);

  // Generate CSS styles for emotion
  const emotionStyles = getEmotionStyles(emotionState);

  return {
    emotionState,
    triggerEmotion,
    onMessageReceived,
    onReaction,
    onStoryPosted,
    onMentioned,
    emotionStyles,
    currentEmotion: emotionState.currentEmotion,
  };
}

// Helper functions
function getAnimationForEmotion(emotion: EmotionState): EmotionAnimationState['ringAnimation'] {
  switch (emotion) {
    case 'online':
      return 'glow';
    case 'typing':
      return 'typing';
    case 'story-posted':
      return 'story';
    case 'message-received':
    case 'reacting':
    case 'mentioned':
      return 'pulse';
    default:
      return 'none';
  }
}

function getIntensityForEmotion(emotion: EmotionState): number {
  switch (emotion) {
    case 'mentioned':
      return 1;
    case 'reacting':
      return 0.9;
    case 'message-received':
      return 0.8;
    case 'story-posted':
      return 0.85;
    case 'typing':
      return 0.7;
    case 'online':
      return 0.6;
    default:
      return 0.3;
  }
}

function getEmotionStyles(state: EmotionAnimationState): React.CSSProperties {
  const baseGlow = `0 0 ${20 * state.intensity}px ${state.glowColor}`;
  
  return {
    boxShadow: baseGlow,
    transition: 'box-shadow 0.3s ease, transform 0.2s ease',
    ...(state.pulseActive && {
      animation: 'avatar-emotion-pulse 0.6s ease-out',
    }),
  };
}

/**
 * Hook to subscribe to user activity events
 */
export function useAvatarActivitySubscription(
  userId: string | null | undefined,
  callbacks: {
    onMessageReceived?: () => void;
    onReaction?: () => void;
    onStoryPosted?: () => void;
    onMentioned?: () => void;
  }
) {
  useEffect(() => {
    if (!userId) return;

    // This would connect to your real-time subscription system
    // For now, it's a placeholder for the architecture
    
    // Example: Subscribe to realtime events
    // const channel = supabase.channel(`avatar-events:${userId}`)
    //   .on('broadcast', { event: 'message' }, callbacks.onMessageReceived)
    //   .on('broadcast', { event: 'reaction' }, callbacks.onReaction)
    //   .subscribe();

    return () => {
      // Cleanup subscription
    };
  }, [userId, callbacks]);
}

export default useAvatarEmotion;
