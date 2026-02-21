/**
 * ULTRA AVATAR SYSTEM - Performance Hook
 * Adaptive performance engine for optimal avatar rendering
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PerformanceLevel, 
  PerformanceConfig, 
  PERFORMANCE_PRESETS 
} from '@/components/avatar/types';

interface DeviceCapabilities {
  isLowEndDevice: boolean;
  isLowBattery: boolean;
  isLowMemory: boolean;
  prefersReducedMotion: boolean;
  gpuTier: 'high' | 'medium' | 'low';
  fps: number;
}

interface UseAvatarPerformanceOptions {
  preferredLevel?: PerformanceLevel;
  enableAutoDetect?: boolean;
}

/**
 * Detects device capabilities and returns appropriate performance settings
 */
export function useAvatarPerformance(options: UseAvatarPerformanceOptions = {}) {
  const { preferredLevel = 'auto', enableAutoDetect = true } = options;
  
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    isLowEndDevice: false,
    isLowBattery: false,
    isLowMemory: false,
    prefersReducedMotion: false,
    gpuTier: 'high',
    fps: 60,
  });
  
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>({
    fps: 60,
    ...PERFORMANCE_PRESETS.high,
  });
  
  const [isTabActive, setIsTabActive] = useState(true);
  const fpsHistoryRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setCapabilities(prev => ({
        ...prev,
        prefersReducedMotion: e.matches,
      }));
    };
    
    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detect battery status
  useEffect(() => {
    if (!enableAutoDetect) return;
    
    const checkBattery = async () => {
      try {
        const battery = await (navigator as any).getBattery?.();
        if (battery) {
          const updateBattery = () => {
            setCapabilities(prev => ({
              ...prev,
              isLowBattery: battery.level < 0.2 && !battery.charging,
            }));
          };
          
          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
        }
      } catch {
        // Battery API not supported
      }
    };
    
    checkBattery();
  }, [enableAutoDetect]);

  // Detect memory pressure
  useEffect(() => {
    if (!enableAutoDetect) return;
    
    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        setCapabilities(prev => ({
          ...prev,
          isLowMemory: usedRatio > 0.8,
        }));
      }
      
      // Also check deviceMemory
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory && deviceMemory < 4) {
        setCapabilities(prev => ({
          ...prev,
          isLowEndDevice: true,
        }));
      }
    };
    
    checkMemory();
    const interval = setInterval(checkMemory, 30000); // Check every 30s
    
    return () => clearInterval(interval);
  }, [enableAutoDetect]);

  // FPS monitoring
  useEffect(() => {
    if (!enableAutoDetect) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        
        fpsHistoryRef.current.push(fps);
        if (fpsHistoryRef.current.length > 10) {
          fpsHistoryRef.current.shift();
        }
        
        const avgFps = Math.round(
          fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length
        );
        
        setCapabilities(prev => ({
          ...prev,
          fps: avgFps,
          gpuTier: avgFps >= 55 ? 'high' : avgFps >= 30 ? 'medium' : 'low',
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      rafIdRef.current = requestAnimationFrame(measureFPS);
    };
    
    // Start measuring after a short delay
    const timeoutId = setTimeout(() => {
      rafIdRef.current = requestAnimationFrame(measureFPS);
    }, 2000);
    
    return () => {
      clearTimeout(timeoutId);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enableAutoDetect]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Calculate optimal performance config
  useEffect(() => {
    let level: PerformanceLevel = preferredLevel;
    
    if (preferredLevel === 'auto' && enableAutoDetect) {
      // Auto-detect optimal level
      if (
        capabilities.isLowEndDevice ||
        capabilities.isLowBattery ||
        capabilities.isLowMemory ||
        capabilities.prefersReducedMotion ||
        capabilities.gpuTier === 'low'
      ) {
        level = 'low';
      } else if (capabilities.gpuTier === 'medium' || capabilities.fps < 50) {
        level = 'medium';
      } else {
        level = 'high';
      }
    }
    
    const preset = PERFORMANCE_PRESETS[level === 'auto' ? 'high' : level];
    
    setPerformanceConfig({
      fps: capabilities.fps,
      ...preset,
      // Override if reduced motion preferred
      reduceMotion: capabilities.prefersReducedMotion || preset.reduceMotion,
      // Disable animations if tab is inactive
      enableAnimations: isTabActive && preset.enableAnimations,
    });
  }, [capabilities, preferredLevel, enableAutoDetect, isTabActive]);

  // Viewport visibility check hook
  const useViewportVisibility = useCallback((elementRef: React.RefObject<HTMLElement>) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
      if (!elementRef.current) return;
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
        },
        { threshold: 0.1, rootMargin: '50px' }
      );
      
      observer.observe(elementRef.current);
      
      return () => observer.disconnect();
    }, [elementRef]);
    
    return isVisible;
  }, []);

  // Should render animations
  const shouldAnimate = useCallback((priority: boolean = false) => {
    if (priority) return performanceConfig.enableAnimations;
    return performanceConfig.enableAnimations && isTabActive;
  }, [performanceConfig.enableAnimations, isTabActive]);

  // Should render effects
  const shouldRenderEffects = useCallback((priority: boolean = false) => {
    if (priority) return performanceConfig.enableEffects;
    return performanceConfig.enableEffects && !capabilities.isLowBattery;
  }, [performanceConfig.enableEffects, capabilities.isLowBattery]);

  return {
    capabilities,
    performanceConfig,
    isTabActive,
    useViewportVisibility,
    shouldAnimate,
    shouldRenderEffects,
    currentLevel: preferredLevel === 'auto' 
      ? (capabilities.gpuTier === 'high' ? 'high' : capabilities.gpuTier === 'medium' ? 'medium' : 'low')
      : preferredLevel,
  };
}

/**
 * Hook to pause animations when element is not visible
 */
export function useAnimationPause(isVisible: boolean, isTabActive: boolean) {
  const [shouldAnimate, setShouldAnimate] = useState(true);
  
  useEffect(() => {
    setShouldAnimate(isVisible && isTabActive);
  }, [isVisible, isTabActive]);
  
  return shouldAnimate;
}

/**
 * GPU acceleration style helper
 */
export function getGPUAcceleratedStyle(): React.CSSProperties {
  return {
    transform: 'translateZ(0)',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    perspective: 1000,
  };
}

export default useAvatarPerformance;
