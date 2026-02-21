import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const AUTH_TIMEOUT = 10000; // 10 seconds timeout

export const useAuthWithTimeout = () => {
  const auth = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!auth.loading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (auth.loading) {
        setTimedOut(true);
        console.warn('Auth loading timed out');
      }
    }, AUTH_TIMEOUT);

    return () => clearTimeout(timer);
  }, [auth.loading]);

  const retry = useCallback(() => {
    setTimedOut(false);
    window.location.reload();
  }, []);

  return {
    ...auth,
    timedOut,
    retry,
    // If timed out, treat as not loading but not authenticated
    loading: auth.loading && !timedOut,
    isAuthenticated: timedOut ? false : auth.isAuthenticated,
  };
};
