/**
 * Invisible component that initializes FCM token registration on native devices.
 * Should be rendered inside AuthProvider.
 */
import { useFCMToken } from '@/hooks/useFCMToken';

const FCMInitializer = () => {
  useFCMToken();
  return null;
};

export default FCMInitializer;
