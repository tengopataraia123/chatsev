/**
 * Root Controls RBAC Utility
 * 
 * Provides permission checks for absolute authority accounts.
 * Root accounts are identified by stable user_id, NOT username.
 * 
 * ROOT ACCOUNTS:
 * - CHEGE: b067dbd7-1235-407f-8184-e2f6aef034d3
 * - PIKASO: 204eb697-6b0a-453a-beee-d32e0ab72bfd
 */

// Stable user IDs for root accounts
export const ROOT_USER_IDS = [
  'b067dbd7-1235-407f-8184-e2f6aef034d3', // CHEGE
  '204eb697-6b0a-453a-beee-d32e0ab72bfd', // PIKASO
] as const;

// Individual root account IDs for specific checks
export const CHEGE_USER_ID = 'b067dbd7-1235-407f-8184-e2f6aef034d3';
export const PIKASO_USER_ID = '204eb697-6b0a-453a-beee-d32e0ab72bfd';

/**
 * Check if a user has PERM_ROOT_CONTROLS permission
 * This is based on stable user_id, NOT username
 * 
 * @param userId - The user's ID to check
 * @returns boolean - true if user has root controls permission
 */
export const hasRootControls = (userId: string | null | undefined): boolean => {
  if (!userId) return false;
  return ROOT_USER_IDS.includes(userId as typeof ROOT_USER_IDS[number]);
};

/**
 * Check if a target user is a root account (protected from modification)
 * 
 * @param targetUserId - The target user's ID
 * @returns boolean - true if target is a root account
 */
export const isRootAccount = (targetUserId: string | null | undefined): boolean => {
  if (!targetUserId) return false;
  return ROOT_USER_IDS.includes(targetUserId as typeof ROOT_USER_IDS[number]);
};

/**
 * Check if actor can change target's role
 * 
 * Rules:
 * 1. Root accounts (CHEGE/PIKASO) can change anyone's role
 * 2. Super admins can change user/moderator/admin roles but NOT:
 *    - Other super admins
 *    - Root accounts
 * 3. Everyone else cannot change roles
 * 
 * @param actorUserId - The user attempting to make the change
 * @param actorRole - The actor's current role
 * @param targetUserId - The target user's ID
 * @param targetRole - The target's current role
 * @returns boolean - true if role change is allowed
 */
export const canChangeRole = (
  actorUserId: string | null | undefined,
  actorRole: string | null | undefined,
  targetUserId: string | null | undefined,
  targetRole: string | null | undefined
): boolean => {
  if (!actorUserId || !targetUserId) return false;
  
  // Rule 1: Root accounts can change anyone's role
  if (hasRootControls(actorUserId)) {
    return true;
  }
  
  // Rule 2: Protect root accounts from non-root users
  if (isRootAccount(targetUserId)) {
    return false;
  }
  
  // Rule 3: Super admins can manage non-super_admin roles
  if (actorRole === 'super_admin') {
    // Cannot modify other super_admins
    if (targetRole === 'super_admin') {
      return false;
    }
    // Can modify user/moderator/admin
    return true;
  }
  
  // Rule 4: Everyone else cannot change roles
  return false;
};

/**
 * Check if actor can promote/demote to super_admin
 * Only root accounts can create/remove super_admins
 * 
 * @param actorUserId - The user attempting to make the change
 * @returns boolean - true if actor can manage super_admin status
 */
export const canManageSuperAdmin = (actorUserId: string | null | undefined): boolean => {
  return hasRootControls(actorUserId);
};

/**
 * Check if actor can ignore/block the target
 * Root accounts cannot be ignored/blocked by anyone except other root accounts
 * 
 * @param actorUserId - The user attempting the action
 * @param targetUserId - The target user's ID
 * @returns boolean - true if action is allowed
 */
export const canIgnoreOrBlockUser = (
  actorUserId: string | null | undefined,
  targetUserId: string | null | undefined
): boolean => {
  if (!actorUserId || !targetUserId) return false;
  
  // Root accounts can ignore/block anyone
  if (hasRootControls(actorUserId)) {
    return true;
  }
  
  // Non-root users cannot ignore/block root accounts
  if (isRootAccount(targetUserId)) {
    return false;
  }
  
  // For non-root targets, defer to regular RBAC rules
  return true;
};

/**
 * Get the list of roles that an actor can assign
 * 
 * @param actorUserId - The user attempting to assign roles
 * @param actorRole - The actor's current role
 * @returns array of assignable roles
 */
export const getAssignableRoles = (
  actorUserId: string | null | undefined,
  actorRole: string | null | undefined
): string[] => {
  // Root accounts can assign any role including super_admin
  if (hasRootControls(actorUserId)) {
    return ['user', 'moderator', 'admin', 'super_admin'];
  }
  
  // Super admins can only assign up to admin
  if (actorRole === 'super_admin') {
    return ['user', 'moderator', 'admin'];
  }
  
  // Everyone else cannot assign roles
  return [];
};
