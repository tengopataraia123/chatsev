import { supabase } from '@/integrations/supabase/client';

/**
 * Central presence helper that respects invisible mode.
 * 
 * IMPORTANT: This is the ONLY source of truth for online status.
 * All components MUST use this helper instead of directly checking
 * online_visible_until or last_seen from profiles table.
 * 
 * When a user is invisible:
 * - They appear offline to everyone
 * - They don't appear in online users lists
 * - Their last_seen is hidden
 * - No "typing" indicators are shown
 */

export interface PublicPresence {
  isOnline: boolean;
  lastSeen: string | null;
  onlineVisibleUntil: string | null;
  // isInvisible is ONLY returned when viewing own profile
  isInvisible?: boolean;
}

/**
 * Get the public-safe presence for a user.
 * If the user is invisible, returns offline status.
 * If viewer is viewing their own profile, shows real status + invisible flag.
 */
export const getPublicPresence = async (
  targetUserId: string,
  viewerId: string | null
): Promise<PublicPresence> => {
  // If viewer is viewing own profile, show real data
  if (viewerId === targetUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('online_visible_until, last_seen')
      .eq('user_id', targetUserId)
      .single();
    
    const { data: privacySettings } = await supabase
      .from('privacy_settings')
      .select('is_invisible')
      .eq('user_id', targetUserId)
      .maybeSingle();
    
    const now = new Date();
    const onlineUntil = profile?.online_visible_until ? new Date(profile.online_visible_until) : null;
    
    return {
      isOnline: onlineUntil ? onlineUntil > now : false,
      lastSeen: profile?.last_seen || null,
      onlineVisibleUntil: profile?.online_visible_until || null,
      isInvisible: privacySettings?.is_invisible || false,
    };
  }
  
  // Check if target user is invisible
  const { data: privacySettings } = await supabase
    .from('privacy_settings')
    .select('is_invisible')
    .eq('user_id', targetUserId)
    .maybeSingle();
  
  // If invisible, return offline status (NEVER expose is_invisible)
  if (privacySettings?.is_invisible) {
    return {
      isOnline: false,
      lastSeen: null, // Don't leak real last_seen
      onlineVisibleUntil: null,
    };
  }
  
  // Normal user - get real presence
  const { data: profile } = await supabase
    .from('profiles')
    .select('online_visible_until, last_seen')
    .eq('user_id', targetUserId)
    .single();
  
  const now = new Date();
  const onlineUntil = profile?.online_visible_until ? new Date(profile.online_visible_until) : null;
  
  return {
    isOnline: onlineUntil ? onlineUntil > now : false,
    lastSeen: profile?.last_seen || null,
    onlineVisibleUntil: profile?.online_visible_until || null,
  };
};

/**
 * Check if a user is online, respecting invisible mode.
 * Use this for simple online checks without fetching all presence data.
 */
export const isUserOnline = async (
  targetUserId: string,
  viewerId: string | null
): Promise<boolean> => {
  const presence = await getPublicPresence(targetUserId, viewerId);
  return presence.isOnline;
};

/**
 * Get user's invisible mode status.
 * This should ONLY be used when the user is viewing their own settings.
 */
export const getInvisibleStatus = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('privacy_settings')
    .select('is_invisible')
    .eq('user_id', userId)
    .maybeSingle();
  
  return data?.is_invisible || false;
};

/**
 * Set user's invisible mode.
 */
export const setInvisibleMode = async (userId: string, isInvisible: boolean): Promise<void> => {
  await supabase
    .from('privacy_settings')
    .upsert({
      user_id: userId,
      is_invisible: isInvisible,
    }, { onConflict: 'user_id' });
};

/**
 * Filter an array of user IDs to exclude invisible users.
 * This is used for online users lists.
 */
export const filterVisibleOnlineUsers = async (
  userIds: string[],
  viewerId: string | null
): Promise<string[]> => {
  if (userIds.length === 0) return [];
  
  // Get invisible users from the list
  const { data: invisibleUsers } = await supabase
    .from('privacy_settings')
    .select('user_id')
    .in('user_id', userIds)
    .eq('is_invisible', true);
  
  const invisibleSet = new Set(invisibleUsers?.map(u => u.user_id) || []);
  
  // Filter out invisible users (except self)
  return userIds.filter(id => !invisibleSet.has(id) || id === viewerId);
};

/**
 * Check if a user's presence data from profile object should be shown as online.
 * This is a sync helper for when you already have profile + privacy data.
 */
export const getPresenceDisplay = (
  profile: { online_visible_until: string | null; last_seen: string | null },
  privacySettings: { is_invisible: boolean } | null,
  isOwnProfile: boolean
): { isOnline: boolean; lastSeen: string | null } => {
  // If viewing own profile, show real status
  if (isOwnProfile) {
    const now = new Date();
    const onlineUntil = profile.online_visible_until ? new Date(profile.online_visible_until) : null;
    return {
      isOnline: onlineUntil ? onlineUntil > now : false,
      lastSeen: profile.last_seen,
    };
  }
  
  // If invisible, show as offline
  if (privacySettings?.is_invisible) {
    return {
      isOnline: false,
      lastSeen: null,
    };
  }
  
  // Normal user
  const now = new Date();
  const onlineUntil = profile.online_visible_until ? new Date(profile.online_visible_until) : null;
  return {
    isOnline: onlineUntil ? onlineUntil > now : false,
    lastSeen: profile.last_seen,
  };
};

/**
 * Check if typing indicator should be shown.
 * Returns false if the user is invisible.
 */
export const shouldShowTyping = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('privacy_settings')
    .select('is_invisible')
    .eq('user_id', userId)
    .maybeSingle();
  
  return !(data?.is_invisible || false);
};
