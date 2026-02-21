// Owner/Founder configuration
export const OWNER_USERNAME = 'CHEGE';
export const OWNER_USER_ID = 'b067dbd7-1235-407f-8184-e2f6aef034d3';

// PIKASO configuration
export const PIKASO_USERNAME = 'P ი კ ა S ო';
export const PIKASO_USER_ID = '204eb697-6b0a-453a-beee-d32e0ab72bfd';

// Spaced display version: C H E G E
export const OWNER_USERNAME_DISPLAY = 'C H E G E';

// Check if username is owner (handles both normal and spaced versions)
export const isOwner = (username: string | null | undefined): boolean => {
  if (!username) return false;
  // Remove spaces for comparison
  const normalized = username.replace(/\s+/g, '').toUpperCase();
  return normalized === OWNER_USERNAME.toUpperCase();
};

export const isOwnerById = (userId: string | null | undefined): boolean => {
  if (!userId) return false;
  return userId === OWNER_USER_ID;
};

// Get the display name for owner (spaced version)
export const getOwnerDisplayName = (username: string): string => {
  if (isOwner(username)) {
    return OWNER_USERNAME_DISPLAY;
  }
  return username;
};
