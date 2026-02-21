/**
 * Avatar utility functions
 */

const DEFAULT_MALE_AVATAR = '/avatars/default-male.png';
const DEFAULT_FEMALE_AVATAR = '/avatars/default-female.png';
const DEFAULT_AVATAR = '/avatars/default.png';

/**
 * Get avatar URL with fallback based on gender
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, gender?: string | null): string {
  if (avatarUrl) {
    return avatarUrl;
  }
  
  if (gender === 'male' || gender === 'კაცი') {
    return DEFAULT_MALE_AVATAR;
  }
  
  if (gender === 'female' || gender === 'ქალი') {
    return DEFAULT_FEMALE_AVATAR;
  }
  
  return DEFAULT_AVATAR;
}

/**
 * Get initials from username
 */
export function getInitials(username: string | null | undefined): string {
  if (!username) return '?';
  return username.charAt(0).toUpperCase();
}
