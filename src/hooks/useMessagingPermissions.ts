import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isMessagingForcedOpen } from '@/lib/adminExemptions';
import { useAuth } from '@/hooks/useAuth';

export interface MessagingPermissions {
  canMessage: boolean;
  canSendMedia: boolean;
  isFriend: boolean;
  isBlocked: boolean;
  isIgnored: boolean;
  isIgnoredByTarget: boolean;
  messagingDisabled: boolean;
  messagePermission: 'everyone' | 'friends' | 'nobody';
  disabledReason: string | null;
}

/**
 * Hook to check messaging permissions between current user and target user
 * Handles all permission checks: friendship, privacy settings, blocks, ignores
 * OPTIMIZED: All queries run in parallel for fast loading
 */
export const useMessagingPermissions = (targetUserId: string | null | undefined) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<MessagingPermissions>({
    canMessage: true, // Default to true to prevent blocking UI
    canSendMedia: false,
    isFriend: false,
    isBlocked: false,
    isIgnored: false,
    isIgnoredByTarget: false,
    messagingDisabled: false,
    messagePermission: 'everyone',
    disabledReason: null,
  });
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (!user || !targetUserId || targetUserId === user.id) {
      setPermissions({
        canMessage: false,
        canSendMedia: false,
        isFriend: false,
        isBlocked: false,
        isIgnored: false,
        isIgnoredByTarget: false,
        messagingDisabled: false,
        messagePermission: 'everyone',
        disabledReason: targetUserId === user?.id ? 'საკუთარ თავს ვერ მისწერ' : null,
      });
      setLoading(false);
      return;
    }

    try {
      // MEGA PARALLEL: Run ALL permission checks at once - no sequential blocking
      const [roleResult, blocksBothResult, ignoreByTargetResult, ignoreByMeResult, friendshipResult, privacyResult] = await Promise.all([
        // 1. Check if current user is admin
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
        // 2. Check blocks between both users
        supabase.from('user_blocks').select('blocker_id, blocked_id').or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`).maybeSingle(),
        // 3. Check if target ignored current user
        supabase.from('user_blocks').select('blocker_id').eq('blocker_id', targetUserId).eq('blocked_id', user.id).maybeSingle(),
        // 4. Check if current user ignored target
        supabase.from('user_blocks').select('blocker_id').eq('blocker_id', user.id).eq('blocked_id', targetUserId).maybeSingle(),
        // 5. Check friendship status
        supabase.from('friendships').select('status').or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`).eq('status', 'accepted').maybeSingle(),
        // 6. Check target user's privacy settings
        supabase.from('privacy_settings').select('message_permission').eq('user_id', targetUserId).maybeSingle()
      ]);

      // Process results
      const isAdmin = ['super_admin', 'admin', 'moderator'].includes(roleResult.data?.role || '');
      setIsSuperAdmin(isAdmin);

      const blockData = blocksBothResult.data;
      const isBlocked = !!blockData;
      const isBlockedByTarget = blockData?.blocker_id === targetUserId;

      const isIgnoredByTarget = !!ignoreByTargetResult.data;
      const isIgnored = !!ignoreByMeResult.data;
      const isFriend = !!friendshipResult.data;
      const messagePermission = isMessagingForcedOpen(targetUserId) 
        ? 'everyone' as const
        : (privacyResult.data?.message_permission || 'everyone') as 'everyone' | 'friends' | 'nobody';

      // If ignored by target, block messaging (unless admin)
      if (isIgnoredByTarget && !isAdmin) {
        setPermissions({
          canMessage: false,
          canSendMedia: false,
          isFriend,
          isBlocked,
          isIgnored,
          isIgnoredByTarget: true,
          messagingDisabled: false,
          messagePermission,
          disabledReason: 'მომხმარებელმა დაგაიგნორათ',
        });
        setLoading(false);
        return;
      }

      if (isBlocked && !isAdmin) {
        setPermissions({
          canMessage: false,
          canSendMedia: false,
          isFriend,
          isBlocked: true,
          isIgnored,
          isIgnoredByTarget,
          messagingDisabled: false,
          messagePermission,
          disabledReason: isBlockedByTarget ? 'მომხმარებელმა დაგბლოკათ' : 'დაბლოკილი მომხმარებელი',
        });
        setLoading(false);
        return;
      }

      // For admins, messaging is never disabled
      const messagingDisabled = isAdmin ? false : messagePermission === 'nobody';

      // Determine if can message
      let canMessage = true;
      let disabledReason: string | null = null;

      if (isAdmin) {
        canMessage = true;
        disabledReason = null;
      } else if (messagePermission === 'nobody') {
        canMessage = false;
        disabledReason = 'მომხმარებელმა დახურა პირადი მიმოწერა';
      } else if (messagePermission === 'friends' && !isFriend) {
        canMessage = false;
        disabledReason = 'შეტყობინების გაგზავნა შესაძლებელია მხოლოდ მეგობრებისთვის';
      }

      // Can send media: admins can always, others need to be friends
      const canSendMedia = isAdmin || isFriend;

      setPermissions({
        canMessage,
        canSendMedia,
        isFriend,
        isBlocked,
        isIgnored,
        isIgnoredByTarget,
        messagingDisabled,
        messagePermission,
        disabledReason,
      });
    } catch (error) {
      console.error('Error checking messaging permissions:', error);
      // On error, default to allowing messaging to prevent blocking
      setPermissions({
        canMessage: true,
        canSendMedia: false,
        isFriend: false,
        isBlocked: false,
        isIgnored: false,
        isIgnoredByTarget: false,
        messagingDisabled: false,
        messagePermission: 'everyone',
        disabledReason: null,
      });
    } finally {
      setLoading(false);
    }
  }, [user, targetUserId]);

  useEffect(() => {
    // CRITICAL: Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    checkPermissions().finally(() => {
      clearTimeout(safetyTimeout);
    });
    
    return () => clearTimeout(safetyTimeout);
  }, [checkPermissions]);

  return { ...permissions, loading, isSuperAdmin, refetch: checkPermissions };
};

/**
 * Check if a user has messaging disabled - for use in lists/cards
 * OPTIMIZED: Parallel queries
 */
export const checkUserMessagingStatus = async (
  targetUserId: string,
  currentUserId: string | null
): Promise<{ canMessage: boolean; reason: string | null }> => {
  if (!currentUserId || targetUserId === currentUserId) {
    return { canMessage: false, reason: null };
  }

  try {
    // Parallel check for role and privacy
    const [roleResult, privacyResult] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', currentUserId).maybeSingle(),
      supabase.from('privacy_settings').select('message_permission').eq('user_id', targetUserId).maybeSingle()
    ]);
    
    // All admin roles can message anyone
    if (['super_admin', 'admin', 'moderator'].includes(roleResult.data?.role || '')) {
      return { canMessage: true, reason: null };
    }

    if (isMessagingForcedOpen(targetUserId)) {
      return { canMessage: true, reason: null };
    }

    if (privacyResult.data?.message_permission === 'nobody') {
      return { canMessage: false, reason: 'მომხმარებელმა დახურა პირადი მიმოწერა' };
    }

    if (privacyResult.data?.message_permission === 'friends') {
      // Check friendship
      const { data: friendshipData } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUserId})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!friendshipData) {
        return { canMessage: false, reason: 'მხოლოდ მეგობრებს შეუძლიათ მიწერა' };
      }
    }

    return { canMessage: true, reason: null };
  } catch (error) {
    console.error('Error checking messaging status:', error);
    return { canMessage: true, reason: null };
  }
};

/**
 * Batch check messaging status for multiple users
 */
export const batchCheckMessagingStatus = async (
  targetUserIds: string[],
  currentUserId: string | null
): Promise<Map<string, boolean>> => {
  const result = new Map<string, boolean>();
  
  if (!currentUserId || targetUserIds.length === 0) {
    targetUserIds.forEach(id => result.set(id, false));
    return result;
  }

  try {
    // Check if current user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUserId)
      .maybeSingle();
    
    // All admin roles can message anyone
    const isAdmin = ['super_admin', 'admin', 'moderator'].includes(roleData?.role || '');
    
    if (isAdmin) {
      targetUserIds.forEach(id => result.set(id, id !== currentUserId));
      return result;
    }

    // Fetch privacy settings for all target users
    const { data: privacySettings } = await supabase
      .from('privacy_settings')
      .select('user_id, message_permission')
      .in('user_id', targetUserIds);

    const privacyMap = new Map<string, string>();
    privacySettings?.forEach(p => privacyMap.set(p.user_id, p.message_permission));

    // Check which users have messaging disabled
    const usersNeedingFriendshipCheck: string[] = [];
    
    targetUserIds.forEach(userId => {
      if (userId === currentUserId) {
        result.set(userId, false);
        return;
      }
      
      const permission = isMessagingForcedOpen(userId) ? 'everyone' : (privacyMap.get(userId) || 'everyone');
      
      if (permission === 'nobody') {
        result.set(userId, false);
      } else if (permission === 'friends') {
        usersNeedingFriendshipCheck.push(userId);
      } else {
        result.set(userId, true);
      }
    });

    // Check friendships for users with 'friends' permission
    if (usersNeedingFriendshipCheck.length > 0) {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(
          usersNeedingFriendshipCheck.map(id => 
            `and(requester_id.eq.${currentUserId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUserId})`
          ).join(',')
        );

      const friendSet = new Set<string>();
      friendships?.forEach(f => {
        if (f.requester_id === currentUserId) {
          friendSet.add(f.addressee_id);
        } else {
          friendSet.add(f.requester_id);
        }
      });

      usersNeedingFriendshipCheck.forEach(userId => {
        result.set(userId, friendSet.has(userId));
      });
    }

    return result;
  } catch (error) {
    console.error('Error batch checking messaging status:', error);
    targetUserIds.forEach(id => result.set(id, true));
    return result;
  }
};
