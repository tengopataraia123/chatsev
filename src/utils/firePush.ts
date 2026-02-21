/**
 * Fire-and-forget push notification sender.
 * Call this alongside supabase.from('notifications').insert() calls.
 * Does NOT block the caller — errors are silently logged.
 */
import { supabase } from '@/integrations/supabase/client';

interface PushParams {
  targetUserId: string;
  type?: string;
  fromUserId?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

export function firePush({ targetUserId, type, fromUserId, title, body, data }: PushParams) {
  // Don't send push to yourself
  if (fromUserId && targetUserId === fromUserId) return;

  // Fire and forget — no await
  supabase.functions.invoke('send-push-notification', {
    body: {
      target_user_id: targetUserId,
      type,
      from_user_id: fromUserId,
      title,
      body,
      data,
    },
  }).then(res => {
    if (res.error) console.error('Push failed:', res.error);
  }).catch(err => {
    console.error('Push error:', err);
  });
}
