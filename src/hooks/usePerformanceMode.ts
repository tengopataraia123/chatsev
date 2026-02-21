/**
 * Performance Mode Hook
 * Provides device-aware settings for components to adapt their rendering.
 * Use this to conditionally disable heavy effects on low-end devices.
 */
import { useMemo } from 'react';
import { getDeviceProfile, getMediaPolicy } from '@/lib/mobilePerformance';

export const usePerformanceMode = () => {
  return useMemo(() => {
    const profile = getDeviceProfile();
    const policy = getMediaPolicy();
    
    return {
      // Device info
      isLowEnd: profile.isLowEnd,
      isMobile: profile.isMobile,
      gpuTier: profile.gpuTier,
      
      // What to enable/disable
      enableBlur: policy.enableBlur,
      enableShadows: policy.enableShadows,
      enableTransitions: policy.enableTransitions,
      videoAutoplay: policy.videoAutoplay,
      videoPreload: policy.videoPreload,
      maxVideoResolution: policy.maxVideoResolution,
      maxImageWidth: policy.maxImageWidth,
      paginationLimit: policy.paginationLimit,
      
      // CSS helper
      blurClass: policy.enableBlur ? 'backdrop-blur-sm' : '',
      headerClass: policy.enableBlur 
        ? 'bg-background/95 backdrop-blur-sm' 
        : 'bg-background',
    };
  }, []);
};

export default usePerformanceMode;
