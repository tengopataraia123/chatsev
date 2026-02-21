import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Parse user agent to get browser name
const getBrowserName = (ua: string): string => {
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('MSIE') || ua.includes('Trident')) return 'Internet Explorer';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('UCBrowser')) return 'UC Browser';
  return 'უცნობი';
};

// Parse user agent to get device type/model
const getDeviceType = (ua: string): string => {
  // Check for specific devices first
  if (ua.includes('iPhone')) {
    // Try to detect iPhone model from screen size
    const screenH = window.screen.height;
    const screenW = window.screen.width;
    // Common iPhone resolutions
    if (screenH === 926 || screenW === 926) return 'iPhone 12/13/14 Pro Max';
    if (screenH === 844 || screenW === 844) return 'iPhone 12/13/14';
    if (screenH === 896 || screenW === 896) return 'iPhone 11 Pro Max/XS Max';
    if (screenH === 812 || screenW === 812) return 'iPhone X/XS/11 Pro';
    if (screenH === 736 || screenW === 736) return 'iPhone 6/7/8 Plus';
    if (screenH === 667 || screenW === 667) return 'iPhone 6/7/8';
    return 'iPhone';
  }
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) {
    // Multiple regex patterns to extract Android device model
    // Pattern 1: "Android X.X; Model Build" or "Android X.X; en-us; Model Build"
    let match = ua.match(/Android\s[\d.]+;\s*(?:[a-z]{2}-[a-z]{2};\s*)?([^;)]+?)(?:\s+Build|[;)])/i);
    if (match && match[1]) {
      let model = match[1].trim();
      // Clean up common prefixes
      model = model.replace(/^(SAMSUNG|Samsung|LG|Xiaomi|Redmi|POCO|Huawei|Honor|Oppo|Vivo|Realme|OnePlus)\s*/i, '');
      // If model looks valid (not just 'K' or 'wv' or short codes)
      if (model && model.length > 2 && !/^[A-Z]{1,2}$/.test(model)) {
        // Check for Samsung Galaxy patterns
        if (/SM-[A-Z]\d+/i.test(model) || model.includes('Galaxy')) {
          return `Samsung ${model}`;
        }
        if (/Redmi|POCO/i.test(ua)) {
          return `Xiaomi ${model}`;
        }
        if (/Pixel/i.test(model)) {
          return `Google ${model}`;
        }
        return model;
      }
    }
    
    // Pattern 2: Try to find device model after semicolon
    match = ua.match(/;\s*([A-Za-z]+\s+[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)\s+Build/i);
    if (match && match[1] && match[1].length > 3) {
      return match[1].trim();
    }
    
    return 'Android';
  }
  if (ua.includes('Windows Phone')) return 'Windows Phone';
  if (ua.includes('Windows NT 10')) return 'Windows 10/11 PC';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Macintosh')) return 'Mac';
  if (ua.includes('Linux')) return 'Linux PC';
  return 'უცნობი';
};

// Get device model using modern API (works better on newer browsers)
const getDeviceModel = async (): Promise<string | null> => {
  try {
    // Check if userAgentData API is available (Chrome 90+, Edge 90+, Opera 76+)
    if ('userAgentData' in navigator && (navigator as any).userAgentData) {
      const uaData = (navigator as any).userAgentData;
      // Request high entropy values which include device model
      if (uaData.getHighEntropyValues) {
        const hints = await uaData.getHighEntropyValues(['model', 'platformVersion']);
        if (hints.model && hints.model.length > 0) {
          return hints.model;
        }
      }
    }
  } catch (err) {
    console.log('[DeviceTracking] userAgentData not available:', err);
  }
  return null;
};

// Generate a STABLE device fingerprint that persists across all users on same device
const generateDeviceFingerprint = (): string => {
  // Use a device-level storage key that is NOT user-specific
  const DEVICE_KEY = 'shared_device_fingerprint';
  const stored = localStorage.getItem(DEVICE_KEY);
  if (stored) return stored;

  // Create fingerprint from browser/device characteristics only
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0,
    // Canvas fingerprint - device specific
    (() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillStyle = '#f60';
          ctx.fillRect(10, 10, 100, 30);
          ctx.fillStyle = '#069';
          ctx.fillText('Device-FP-Test', 15, 15);
          return canvas.toDataURL().slice(-100);
        }
      } catch {
        return 'no-canvas';
      }
      return 'no-canvas';
    })(),
  ].join('|');

  // Simple hash function - deterministic, no random or time-based values
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Create fingerprint WITHOUT timestamp - pure device characteristics
  const fingerprint = `dfp_${Math.abs(hash).toString(36)}`;
  localStorage.setItem(DEVICE_KEY, fingerprint);
  return fingerprint;
};

// Fetch client IP from edge function
const getClientIp = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-client-ip');
    if (error) {
      console.error('[DeviceTracking] IP fetch error:', error);
      return null;
    }
    return data?.ip || null;
  } catch (err) {
    console.error('[DeviceTracking] IP fetch exception:', err);
    return null;
  }
};

// Fetch geolocation data and update device_accounts
const updateGeoLocation = async (userId: string, fingerprint: string, ipAddress: string | null): Promise<void> => {
  if (!ipAddress) {
    console.log('[DeviceTracking] No IP address available for geolocation');
    return;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('geolocate-ip', {
      body: { user_id: userId, device_fingerprint: fingerprint, ip_address: ipAddress }
    });
    
    if (error) {
      console.error('[DeviceTracking] Geolocation error:', error);
      return;
    }
    
    console.log('[DeviceTracking] Geolocation updated:', data);
  } catch (err) {
    console.error('[DeviceTracking] Geolocation exception:', err);
  }
};

export const useDeviceTracking = () => {
  const { user, profile } = useAuth();

  const trackDevice = useCallback(async () => {
    if (!user?.id) return;

    try {
      const fingerprint = generateDeviceFingerprint();
      const userAgent = navigator.userAgent;
      const username = profile?.username || null;
      const ipAddress = await getClientIp();
      const browserName = getBrowserName(userAgent);
      
      // Try to get device model from modern API first, fallback to user-agent parsing
      let deviceType = getDeviceType(userAgent);
      const deviceModel = await getDeviceModel();
      
      // If we got a model from the modern API and current deviceType is generic "Android"
      if (deviceModel && deviceType === 'Android') {
        deviceType = deviceModel;
      }

      console.log('[DeviceTracking] Tracking device:', { 
        fingerprint, 
        username, 
        ipAddress, 
        browserName, 
        deviceType,
        deviceModel
      });

      // Upsert device tracking record with IP and browser info
      const { error } = await supabase
        .from('device_accounts')
        .upsert(
          {
            device_fingerprint: fingerprint,
            user_id: user.id,
            username: username,
            user_agent: userAgent,
            ip_address: ipAddress,
            browser_name: browserName,
            device_type: deviceType,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: 'device_fingerprint,user_id',
          }
        );

      if (error) {
        console.error('[DeviceTracking] Upsert error:', error);
      } else {
        console.log('[DeviceTracking] Successfully tracked device');
        // Update geolocation in background (non-blocking)
        updateGeoLocation(user.id, fingerprint, ipAddress);
      }
    } catch (err) {
      console.error('[DeviceTracking] Error:', err);
    }
  }, [user?.id, profile?.username]);

  useEffect(() => {
    if (user?.id) {
      trackDevice();
    }
  }, [user?.id, trackDevice]);

  return { trackDevice };
};

export default useDeviceTracking;