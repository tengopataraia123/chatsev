import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ProfilePrivacyResult {
  canViewProfile: boolean;
  isFriend: boolean;
  isBlocked: boolean;
  profileVisibility: 'everyone' | 'friends' | 'nobody';
  blockedReason: string | null;
  loading: boolean;
  isAdminOverride: boolean;
}

/**
 * Centralized hook for profile visibility access control
 * Handles all privacy checks: visibility settings, friendship, blocks, admin bypass
 * 
 * Role-based overrides:
 * - Super Admin, Admin, Moderator → can view ALL profiles
 * - Regular users → subject to privacy settings
 */
export const useProfilePrivacy = (targetUserId: string | null | undefined) => {
  const { user } = useAuth();
  const [result, setResult] = useState<ProfilePrivacyResult>({
    canViewProfile: true, // Default to true to prevent blocking UI initially
    isFriend: false,
    isBlocked: false,
    profileVisibility: 'everyone',
    blockedReason: null,
    loading: true,
    isAdminOverride: false,
  });

  const checkProfileAccess = useCallback(async () => {
    // If no target user or viewing own profile, allow access
    if (!targetUserId || !user || targetUserId === user.id) {
      setResult({
        canViewProfile: true,
        isFriend: false,
        isBlocked: false,
        profileVisibility: 'everyone',
        blockedReason: null,
        loading: false,
        isAdminOverride: false,
      });
      return;
    }

    try {
      // PARALLEL: Run all checks at once for maximum performance
      const [roleResult, privacyResult, friendshipResult, blockResult] = await Promise.all([
        // 1. Check if current user has admin/mod role (bypass all restrictions)
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(),
        
        // 2. Get target user's privacy settings
        supabase
          .from('privacy_settings')
          .select('profile_visibility')
          .eq('user_id', targetUserId)
          .maybeSingle(),
        
        // 3. Check friendship status
        supabase
          .from('friendships')
          .select('status')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
          .eq('status', 'accepted')
          .maybeSingle(),
        
        // 4. Check if blocked (either direction)
        supabase
          .from('user_blocks')
          .select('blocker_id')
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`)
          .maybeSingle()
      ]);

      // Process role - admin/mod/super_admin can bypass all restrictions
      const userRole = roleResult.data?.role;
      const isAdmin = ['super_admin', 'admin', 'moderator'].includes(userRole || '');
      
      // Process friendship
      const isFriend = !!friendshipResult.data;
      
      // Process block status
      const isBlocked = !!blockResult.data;
      
      // Process privacy setting
      const profileVisibility = (privacyResult.data?.profile_visibility || 'everyone') as 'everyone' | 'friends' | 'nobody';

      // Determine access
      let canViewProfile = true;
      let blockedReason: string | null = null;

      // Admins bypass all restrictions
      if (isAdmin) {
        setResult({
          canViewProfile: true,
          isFriend,
          isBlocked,
          profileVisibility,
          blockedReason: null,
          loading: false,
          isAdminOverride: true,
        });
        return;
      }

      // Check block status first (highest priority)
      if (isBlocked) {
        canViewProfile = false;
        blockedReason = 'მომხმარებელი დაბლოკილია';
      }
      // Then check privacy settings
      else if (profileVisibility === 'nobody') {
        canViewProfile = false;
        blockedReason = 'პროფილზე წვდომა შეზღუდულია — მომხმარებელმა დახურა პროფილი ყველასთვის';
      } else if (profileVisibility === 'friends' && !isFriend) {
        canViewProfile = false;
        blockedReason = 'პროფილზე წვდომა შეზღუდულია — მხოლოდ მეგობრებისთვისაა ხელმისაწვდომი';
      }

      setResult({
        canViewProfile,
        isFriend,
        isBlocked,
        profileVisibility,
        blockedReason,
        loading: false,
        isAdminOverride: false,
      });
    } catch (error) {
      console.error('Error checking profile privacy:', error);
      // On error, allow access to prevent blocking
      setResult({
        canViewProfile: true,
        isFriend: false,
        isBlocked: false,
        profileVisibility: 'everyone',
        blockedReason: null,
        loading: false,
        isAdminOverride: false,
      });
    }
  }, [user, targetUserId]);

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      setResult(prev => ({ ...prev, loading: false }));
    }, 5000);

    checkProfileAccess().finally(() => {
      clearTimeout(safetyTimeout);
    });

    return () => clearTimeout(safetyTimeout);
  }, [checkProfileAccess]);

  return { ...result, refetch: checkProfileAccess };
};

/**
 * Quick check for profile access - for use in lists/cards
 * Returns immediately with cached result or performs quick check
 */
export const checkProfileAccessSync = async (
  targetUserId: string,
  currentUserId: string | null
): Promise<{ canView: boolean; reason: string | null }> => {
  if (!currentUserId || targetUserId === currentUserId) {
    return { canView: true, reason: null };
  }

  try {
    // Check role first
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUserId)
      .maybeSingle();

    // Admins can view all
    if (['super_admin', 'admin', 'moderator'].includes(roleData?.role || '')) {
      return { canView: true, reason: null };
    }

    // Check privacy settings
    const { data: privacyData } = await supabase
      .from('privacy_settings')
      .select('profile_visibility')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const visibility = privacyData?.profile_visibility || 'everyone';

    if (visibility === 'nobody') {
      return { canView: false, reason: 'პროფილი დახურულია' };
    }

    if (visibility === 'friends') {
      // Check friendship
      const { data: friendData } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUserId})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!friendData) {
        return { canView: false, reason: 'პროფილი მხოლოდ მეგობრებისთვისაა' };
      }
    }

    return { canView: true, reason: null };
  } catch (error) {
    console.error('Error checking profile access:', error);
    return { canView: true, reason: null }; // Allow on error
  }
};
