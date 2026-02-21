import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface CreateApprovalParams {
  type: 'registration' | 'post' | 'post_image' | 'post_video' | 'story' | 'reel' | 'avatar' | 'cover' | 'poll';
  userId: string;
  contentId?: string;
  contentData?: Json;
}

export const createPendingApproval = async ({
  type,
  userId,
  contentId,
  contentData,
}: CreateApprovalParams) => {
  // First, create the pending approval immediately (without waiting for IP)
  const insertData = {
    type,
    user_id: userId,
    content_id: contentId || null,
    content_data: contentData || null,
    ip_address: null as string | null,
    status: 'pending'
  };

  // Try to get IP address with a short timeout - don't block the main operation
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    insertData.ip_address = data.ip;
  } catch {
    // IP fetch failed or timed out, continue without it
  }

  // Insert the pending approval
  const { error } = await supabase
    .from('pending_approvals')
    .insert([insertData]);

  if (error) {
    console.error('Error creating pending approval:', error);
    throw error;
  }

  return true;
};

export const checkUserApproved = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error checking user approval:', error);
    return false;
  }

  return data?.is_approved === true;
};
