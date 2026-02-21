/**
 * Hook for managing FCM push token registration on native (Capacitor) devices
 */
import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Check if running inside Capacitor native shell
const isNative = () => {
  return typeof (window as any)?.Capacitor !== 'undefined' && 
         (window as any)?.Capacitor?.isNativePlatform?.() === true;
};

export function useFCMToken() {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  const registerToken = useCallback(async (token: string) => {
    if (!user?.id || !token) return;

    try {
      const platform = (window as any)?.Capacitor?.getPlatform?.() || 'android';
      
      // Upsert token (unique constraint on user_id + token)
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          { user_id: user.id, token, platform },
          { onConflict: 'user_id,token' }
        );
      
      if (error) {
        console.error('Failed to register push token:', error);
      } else {
        console.log('Push token registered successfully');
      }
    } catch (err) {
      console.error('Error registering push token:', err);
    }
  }, [user?.id]);

  const removeToken = useCallback(async (token: string) => {
    if (!user?.id || !token) return;
    
    try {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', token);
    } catch (err) {
      console.error('Error removing push token:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isNative() || registeredRef.current) return;

    let cleanup: (() => void) | undefined;

    const initPush = async () => {
      try {
        // Dynamically import Capacitor push notifications plugin
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        // Register for push
        await PushNotifications.register();

        // Listen for token
        const tokenListener = await PushNotifications.addListener('registration', (tokenData) => {
          console.log('FCM token received:', tokenData.value?.substring(0, 20) + '...');
          registerToken(tokenData.value);
        });

        // Listen for errors
        const errorListener = await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Listen for notifications received while app is in foreground
        const foregroundListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.log('Push notification received in foreground:', notification.title);
            // Foreground notifications are handled by in-app notification system
          }
        );

        // Listen for notification taps (when user taps notification)
        const tapListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            const data = action.notification.data;
            console.log('Push notification tapped:', data);
            
            // Navigate based on notification data
            if (data?.route) {
              window.location.hash = data.route;
            }
          }
        );

        registeredRef.current = true;

        cleanup = () => {
          tokenListener.remove();
          errorListener.remove();
          foregroundListener.remove();
          tapListener.remove();
        };
      } catch (err) {
        // Plugin not available (web environment) - silently ignore
        console.log('Push notifications plugin not available (web environment)');
      }
    };

    initPush();

    return () => {
      cleanup?.();
    };
  }, [user?.id, registerToken]);

  return { registerToken, removeToken, isNative: isNative() };
}
