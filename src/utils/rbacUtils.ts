/**
 * Role-Based Access Control (RBAC) Utility
 * 
 * Implements the complete role hierarchy for ignore, block, and authority logic.
 * 
 * ROLE HIERARCHY (Highest → Lowest):
 * 1) super_admin
 * 2) admin
 * 3) moderator
 * 4) user (default when no role assigned)
 * 
 * ROOT CONTROLS (Hidden Authority Layer):
 * - Root accounts have absolute authority over all roles
 * - Root accounts are protected from modification by non-root users
 * - See rootUtils.ts for root-specific checks
 */

import { isRootAccount, canIgnoreOrBlockUser as rootCanIgnoreOrBlock } from './rootUtils';

export type AppRole = 'super_admin' | 'admin' | 'moderator' | 'user';

// Role levels (higher number = higher authority)
const ROLE_LEVELS: Record<AppRole, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

/**
 * Get the numeric level of a role for comparison
 * Returns 1 (user level) for null/undefined roles
 */
export const getRoleLevel = (role: string | null | undefined): number => {
  if (!role) return ROLE_LEVELS.user;
  return ROLE_LEVELS[role as AppRole] ?? ROLE_LEVELS.user;
};

/**
 * Normalize role string to AppRole type
 */
export const normalizeRole = (role: string | null | undefined): AppRole => {
  if (!role) return 'user';
  const validRoles: AppRole[] = ['super_admin', 'admin', 'moderator', 'user'];
  return validRoles.includes(role as AppRole) ? (role as AppRole) : 'user';
};

/**
 * Check if viewer can ignore/block the target user
 * 
 * Rules:
 * - Root accounts cannot be ignored by non-root users
 * - super_admin → can ignore ANYONE (including other super_admins)
 * - admin → can ignore users, moderators (NOT super_admin)
 * - moderator → can ignore users ONLY
 * - user → can ignore users ONLY
 * 
 * @param viewerRole - The role of the person attempting to ignore
 * @param targetRole - The role of the person being ignored
 * @param viewerUserId - Optional: The viewer's user ID for root checks
 * @param targetUserId - Optional: The target's user ID for root checks
 * @returns boolean - true if the action is allowed
 */
export const canIgnore = (
  viewerRole: string | null | undefined,
  targetRole: string | null | undefined,
  viewerUserId?: string | null,
  targetUserId?: string | null
): boolean => {
  // If we have user IDs, check root protection first
  if (viewerUserId && targetUserId) {
    if (!rootCanIgnoreOrBlock(viewerUserId, targetUserId)) {
      return false;
    }
  } else if (targetUserId && isRootAccount(targetUserId)) {
    // If only target ID provided and they're root, block
    return false;
  }
  
  const viewer = normalizeRole(viewerRole);
  const target = normalizeRole(targetRole);
  
  // super_admin can ignore anyone (except root accounts - handled above)
  if (viewer === 'super_admin') return true;
  
  // admin can ignore users and moderators (NOT super_admin)
  if (viewer === 'admin' && target !== 'super_admin') return true;
  
  // moderator can only ignore regular users
  if (viewer === 'moderator' && target === 'user') return true;
  
  // user can only ignore other regular users
  if (viewer === 'user' && target === 'user') return true;
  
  // All other cases are blocked
  return false;
};

/**
 * Check if viewer can block the target user (same rules as ignore)
 */
export const canBlock = canIgnore;

/**
 * Check if the ignore button should be visible in the UI
 * 
 * This is identical to canIgnore but provides semantic clarity
 * The button should be completely hidden (not disabled) when not allowed
 */
export const shouldShowIgnoreButton = canIgnore;

/**
 * Check if viewer can manage roles
 * Only super_admin can manage roles
 */
export const canManageRoles = (viewerRole: string | null | undefined): boolean => {
  return normalizeRole(viewerRole) === 'super_admin';
};

/**
 * Check if viewer can site-ban the target user
 * 
 * Rules:
 * - super_admin → can site-ban anyone (including other admins, but not super_admins in practice)
 * - admin → can site-ban users and moderators (NOT super_admin or other admin)
 * - moderator → can site-ban users ONLY
 * - user → cannot site-ban anyone
 */
export const canSiteBan = (
  viewerRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean => {
  const viewer = normalizeRole(viewerRole);
  const target = normalizeRole(targetRole);
  
  // Regular users cannot site-ban anyone
  if (viewer === 'user') return false;
  
  // super_admin can ban anyone except other super_admins
  if (viewer === 'super_admin' && target !== 'super_admin') return true;
  
  // admin can ban users and moderators
  if (viewer === 'admin' && (target === 'user' || target === 'moderator')) return true;
  
  // moderator can only ban regular users
  if (viewer === 'moderator' && target === 'user') return true;
  
  return false;
};

/**
 * Check if viewer has higher authority than target
 */
export const hasHigherAuthority = (
  viewerRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean => {
  return getRoleLevel(viewerRole) > getRoleLevel(targetRole);
};

/**
 * Check if viewer has equal or higher authority than target
 */
export const hasEqualOrHigherAuthority = (
  viewerRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean => {
  return getRoleLevel(viewerRole) >= getRoleLevel(targetRole);
};

/**
 * Check if the target user has a protected role (admin, moderator, super_admin)
 */
export const isProtectedRole = (role: string | null | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized !== 'user';
};

/**
 * Check if the target is an admin role (admin or super_admin)
 */
export const isAdminRole = (role: string | null | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'super_admin';
};

/**
 * Check if the role is super_admin
 */
export const isSuperAdminRole = (role: string | null | undefined): boolean => {
  return normalizeRole(role) === 'super_admin';
};

/**
 * Check if the role is at least moderator level
 */
export const isModeratorOrAbove = (role: string | null | undefined): boolean => {
  return getRoleLevel(role) >= ROLE_LEVELS.moderator;
};
