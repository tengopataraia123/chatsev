import { isOwner, OWNER_USER_ID, PIKASO_USER_ID } from './ownerUtils';

// პიკასო variations - including mixed Latin/Georgian like "P ი კ ა S ო"
const PIKASO_PATTERNS = [
  'პიკასო',
  'pikaso',
  'pიკაsო',
  'pიკასო',
];

// Check if user is Pikaso by user_id (preferred, secure)
export const isPikasoById = (userId: string | null | undefined): boolean => {
  if (!userId) return false;
  return userId === PIKASO_USER_ID;
};

// Check if username is Pikaso (legacy, less secure)
export const isPikaso = (username: string | null | undefined): boolean => {
  if (!username) return false;
  const normalized = username.replace(/\s+/g, '').toLowerCase();
  return PIKASO_PATTERNS.some(pattern => 
    normalized.toLowerCase() === pattern.toLowerCase()
  );
};

// Check if user can view private messages (CHEGE or Pikaso only) - by user_id
export const canViewPrivateMessagesByUserId = (userId: string | null | undefined): boolean => {
  if (!userId) return false;
  return userId === OWNER_USER_ID || userId === PIKASO_USER_ID;
};

// Check if user can view private messages (CHEGE or Pikaso only) - legacy username check
export const canViewPrivateMessages = (username: string | null | undefined): boolean => {
  if (!username) return false;
  return isOwner(username) || isPikaso(username);
};

// Check if a conversation should be visible to the current viewer
// CHEGE can see everyone's messages
// Pikaso CANNOT see any conversations involving CHEGE
export const shouldShowConversation = (
  viewerUsername: string | null | undefined,
  conversationParticipantIds: string[]
): boolean => {
  if (!viewerUsername) return false;
  
  // CHEGE can see everything
  if (isOwner(viewerUsername)) return true;
  
  // Pikaso cannot see conversations involving CHEGE
  if (isPikaso(viewerUsername)) {
    return !conversationParticipantIds.includes(OWNER_USER_ID);
  }
  
  return false;
};

// Check if a message should be visible to the current viewer
export const shouldShowMessage = (
  viewerUsername: string | null | undefined,
  senderId: string
): boolean => {
  if (!viewerUsername) return false;
  
  // CHEGE can see everything
  if (isOwner(viewerUsername)) return true;
  
  // Pikaso cannot see messages from CHEGE
  if (isPikaso(viewerUsername)) {
    return senderId !== OWNER_USER_ID;
  }
  
  return false;
};
