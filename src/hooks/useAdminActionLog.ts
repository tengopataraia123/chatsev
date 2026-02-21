import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type ActionType = 
  | 'approve' 
  | 'reject' 
  | 'delete' 
  | 'block' 
  | 'unblock' 
  | 'edit' 
  | 'mute' 
  | 'unmute'
  | 'review'
  | 'warn'
  | 'other';

type ActionCategory = 
  | 'user'           // User registration, activation, deactivation
  | 'content'        // Posts, photos, videos, stories, reels
  | 'chat'           // Group chat messages
  | 'message'        // Private messages
  | 'security'       // Blocks, bans, IP blocks
  | 'moderation'     // General moderation actions
  | 'report'         // Report handling
  | 'dating'         // Dating module
  | 'group'          // Groups/Pages
  | 'blog';          // Blog/Article moderation

interface LogAdminActionParams {
  actionType: ActionType;
  actionCategory: ActionCategory;
  targetUserId?: string | null;
  targetContentId?: string | null;
  targetContentType?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an admin action to the admin_action_logs table.
 * Should be called whenever an admin performs a moderation action.
 */
export const logAdminAction = async ({
  actionType,
  actionCategory,
  targetUserId = null,
  targetContentId = null,
  targetContentType = null,
  description,
  metadata = {}
}: LogAdminActionParams): Promise<boolean> => {
  try {
    // First check if user has admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin', 'moderator'])
      .order('role')
      .limit(1)
      .maybeSingle();

    if (!roleData) return false;

    const { error } = await supabase
      .from('admin_action_logs')
      .insert({
        admin_id: user.id,
        admin_role: roleData.role,
        action_type: actionType,
        action_category: actionCategory,
        target_user_id: targetUserId,
        target_content_id: targetContentId,
        target_content_type: targetContentType,
        description,
        metadata: metadata as Json
      });

    if (error) {
      console.error('Failed to log admin action:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging admin action:', error);
    return false;
  }
};

/**
 * Hook for components that need to log admin actions
 */
export const useAdminActionLog = () => {
  return { logAdminAction };
};