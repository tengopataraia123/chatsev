/**
 * Admin user IDs that are exempt from certain privacy restrictions:
 * - Always visible in online users list (even with invisible mode)
 * - Message permission forced to 'everyone' (cannot restrict messaging)
 */
export const MESSAGING_FORCED_OPEN_ADMIN_IDS = new Set([
  '2446b682-6528-4123-93d5-3acf509d5b00', // 𝑷𝒐𝒊𝒏𝒕
  '5d7a64b8-4e6d-4909-a099-90baf60e8e33', // ა ვ ა რ ა
  '56a36ad2-366f-4b78-b264-565190014301', // თუთა
]);

/** Check if a user is exempt from invisible mode in online lists */
export const isOnlineVisibleExempt = (userId: string): boolean => 
  MESSAGING_FORCED_OPEN_ADMIN_IDS.has(userId);

/** Check if a user has forced-open messaging (cannot restrict) */
export const isMessagingForcedOpen = (userId: string): boolean => 
  MESSAGING_FORCED_OPEN_ADMIN_IDS.has(userId);
