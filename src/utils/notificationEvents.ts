// Global event system for notification count refresh
// This allows components to trigger count refreshes across the app

export const NOTIFICATION_REFRESH_EVENT = 'app:refresh-notification-counts';
export const MESSAGES_REFRESH_EVENT = 'app:refresh-message-counts';

// Dispatch event to refresh notification counts
export const triggerNotificationRefresh = () => {
  window.dispatchEvent(new CustomEvent(NOTIFICATION_REFRESH_EVENT));
};

// Dispatch event to refresh message counts
export const triggerMessagesRefresh = () => {
  window.dispatchEvent(new CustomEvent(MESSAGES_REFRESH_EVENT));
};

// Dispatch both
export const triggerAllCountsRefresh = () => {
  triggerNotificationRefresh();
  triggerMessagesRefresh();
};

// Hook to listen for refresh events
export const useNotificationRefreshListener = (callback: () => void) => {
  if (typeof window !== 'undefined') {
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, callback);
    return () => window.removeEventListener(NOTIFICATION_REFRESH_EVENT, callback);
  }
  return () => {};
};

export const useMessagesRefreshListener = (callback: () => void) => {
  if (typeof window !== 'undefined') {
    window.addEventListener(MESSAGES_REFRESH_EVENT, callback);
    return () => window.removeEventListener(MESSAGES_REFRESH_EVENT, callback);
  }
  return () => {};
};
