/**
 * Utility to send push notifications via edge function
 */
import { supabase } from '@/integrations/supabase/client';

interface SendPushOptions {
  targetUserId: string;
  title: string;
  body?: string;
  data?: Record<string, string>;
}

export async function sendPushNotification({ targetUserId, title, body, data }: SendPushOptions) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        target_user_id: targetUserId,
        title,
        body,
        data,
      },
    });

    if (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }

    return result?.success ?? false;
  } catch (err) {
    console.error('Error sending push notification:', err);
    return false;
  }
}
