import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';

type AppRole = 'super_admin' | 'admin' | 'moderator' | 'user';

// Auth state machine states for predictable behavior
type AuthState = 'IDLE' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'ERROR';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  userRole: AppRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isOffline: boolean;
  authState: AuthState;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Ultra-fast timeout - don't block UI
const AUTH_INIT_TIMEOUT = 1500; // 1.5 seconds - instant feel

// Cache keys for localStorage
const CACHE_KEYS = {
  profile: 'cached_profile',
  role: 'cached_role',
  session: 'cached_session_exists'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Try to hydrate from cache for instant display
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.profile);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('IDLE');
  const [userRole, setUserRole] = useState<AppRole>(() => {
    try {
      return (localStorage.getItem(CACHE_KEYS.role) as AppRole) || 'user';
    } catch { return 'user'; }
  });
  // Check online status with fallback for browsers where navigator.onLine is undefined
  const [isOffline, setIsOffline] = useState(() => {
    try {
      return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
        ? !navigator.onLine 
        : false;
    } catch {
      return false;
    }
  });
  const initComplete = useRef(false);
  const initTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  
  // Generate UUID that works on all browsers (including older Safari/Chrome)
  const generateUUID = (): string => {
    // Try crypto.randomUUID first (modern browsers)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch {
        // Fall through to fallback
      }
    }
    // Fallback for older browsers (Safari < 15.4, Chrome < 92, etc.)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // CRITICAL: Track device session ID for multi-device support
  // Works on ALL browsers, devices, and platforms
  const deviceSessionId = useRef<string>(
    (() => {
      try {
        let id = localStorage.getItem('device_session_id');
        if (!id) {
          id = generateUUID();
          localStorage.setItem('device_session_id', id);
        }
        return id;
      } catch {
        // localStorage not available (private mode, etc.) - generate temporary ID
        return generateUUID();
      }
    })()
  );

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cached online duration to avoid repeated DB calls
  const cachedOnlineDuration = useRef<number | null>(null);
  
  const updateOnlineStatus = useCallback(async (userId: string) => {
    if (!isMounted.current || isOffline) return;
    try {
      // Use cached duration or default, fetch in background
      let durationMinutes = cachedOnlineDuration.current || 60;
      
      if (cachedOnlineDuration.current === null) {
        // Fetch setting in background, don't block
        supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'online_duration_minutes')
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              cachedOnlineDuration.current = parseInt(data.setting_value) || 60;
            }
          });
      }

      const onlineUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      await supabase
        .from('profiles')
        .update({ 
          last_seen: new Date().toISOString(),
          online_visible_until: onlineUntil
        })
        .eq('user_id', userId);
    } catch {
      // Silent fail - not critical
    }
  }, []);

  const fetchUserRole = useCallback(async (userId: string) => {
    if (!isMounted.current) return;
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      const role = (data?.role as AppRole) || 'user';
      if (isMounted.current) {
        setUserRole(role);
        // Cache for next load
        try { localStorage.setItem(CACHE_KEYS.role, role); } catch {}
      }
    } catch {
      if (isMounted.current) {
        setUserRole('user');
      }
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isMounted.current) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data && isMounted.current) {
        setProfile(data);
        // Cache for next load
        try { localStorage.setItem(CACHE_KEYS.profile, JSON.stringify(data)); } catch {}
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  // Complete initialization - only once
  // FIXED: Accept session as parameter to avoid stale closure issue
  const completeInit = useCallback((currentSession?: Session | null) => {
    if (!initComplete.current && isMounted.current) {
      initComplete.current = true;
      setLoading(false);
      // Use passed session or check if we have a user (more reliable)
      const isAuthenticated = currentSession?.user || user;
      setAuthState(isAuthenticated ? 'AUTHENTICATED' : 'IDLE');
      if (initTimeout.current) {
        clearTimeout(initTimeout.current);
        initTimeout.current = null;
      }
    }
  }, [user]);

  // Reset init state for fresh start
  const resetInitState = useCallback(() => {
    initComplete.current = false;
    setLoading(true);
    setAuthState('AUTHENTICATING');
  }, []);

  // Handle session update - with guard to prevent duplicate processing
  // CRITICAL: This must be synchronous and fast to not block auth
  const handleSessionUpdate = useCallback((newSession: Session | null, skipDataFetch = false) => {
    if (!isMounted.current) return;
    
    // Skip if already initialized with same user to prevent loops
    if (initComplete.current && session?.user?.id === newSession?.user?.id) {
      return;
    }

    if (newSession?.user) {
      // Synchronous state updates - instant
      setSession(newSession);
      setUser(newSession.user);
      
      // Complete init IMMEDIATELY - don't wait for anything
      completeInit(newSession);
      
      
      // Background data fetch - completely non-blocking
      if (!skipDataFetch) {
        setTimeout(() => {
          if (!isMounted.current) return;
          Promise.all([
            fetchUserRole(newSession.user.id),
            fetchProfile(newSession.user.id),
            updateOnlineStatus(newSession.user.id)
          ]).catch(() => {});
        }, 0);
      }
    } else {
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole('user');
      try {
        localStorage.removeItem(CACHE_KEYS.profile);
        localStorage.removeItem(CACHE_KEYS.role);
      } catch {}
      completeInit(null);
    }
  }, [fetchProfile, fetchUserRole, updateOnlineStatus, completeInit, session?.user?.id]);

  // Main auth initialization effect
  useEffect(() => {
    // Safety timeout - ensure loading ends even if auth hangs
    initTimeout.current = setTimeout(() => {
      if (!initComplete.current && isMounted.current) {
        console.warn('Auth init timed out, completing anyway');
        completeInit(null);
      }
    }, AUTH_INIT_TIMEOUT);

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted.current) return;
        
        // Only log non-routine events
        if (event !== 'TOKEN_REFRESHED') {
          console.log('Auth event:', event);
        }
        
        // Handle explicit sign out
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole('user');
          try {
            localStorage.removeItem(CACHE_KEYS.profile);
            localStorage.removeItem(CACHE_KEYS.role);
            localStorage.removeItem(CACHE_KEYS.session);
          } catch {}
          completeInit(null);
          return;
        }

        // Handle token refresh silently
        if (event === 'TOKEN_REFRESHED') {
          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
            updateOnlineStatus(newSession.user.id).catch(() => {});
          }
          completeInit(newSession);
          return;
        }

        // Handle user updated event
        if (event === 'USER_UPDATED') {
          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
          }
          completeInit(newSession);
          return;
        }

        // Handle sign in and initial session
        handleSessionUpdate(newSession);
      }
    );

    // Check for existing session immediately
    supabase.auth.getSession().then(({ data: { session: initSession }, error }) => {
      if (!isMounted.current) return;
      
      if (error) {
        console.error('Initial session check failed:', error);
        completeInit(null);
        return;
      }

      // Only process if we haven't completed init yet
      if (!initComplete.current) {
        handleSessionUpdate(initSession);
      }
    }).catch((error) => {
      console.error('Session check failed:', error);
      if (isMounted.current && !initComplete.current) {
        completeInit(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (initTimeout.current) {
        clearTimeout(initTimeout.current);
      }
    };
  }, [handleSessionUpdate, completeInit, updateOnlineStatus]);

  // Handle visibility change - NEVER refresh tokens here to support multi-device sessions
  // This is CRITICAL for allowing same account on multiple browsers/devices
  useEffect(() => {
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 600000; // 10 minutes - very conservative
    
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!user) return;
      
      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_THROTTLE) return;
      lastUpdateTime = now;
      
      // ONLY update online status - no session/token operations
      // This prevents invalidating sessions on other devices
      updateOnlineStatus(user.id).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, updateOnlineStatus]);

  // Handle online event - just update presence, never touch tokens
  useEffect(() => {
    const handleOnline = () => {
      if (!user) return;
      updateOnlineStatus(user.id).catch(() => {});
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, updateOnlineStatus]);

  // Listen for profile changes (including approval status)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-approval-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && isMounted.current) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Periodic online status update - very infrequent to save resources
  useEffect(() => {
    if (!user) return;

    // Update every 15 minutes - minimal overhead
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(user.id);
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, updateOnlineStatus]);

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole('user');
      
      // Reset init for fresh login
      resetInitState();
      
      // Then sign out from Supabase (local scope only)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Sign out from all devices
  const signOutAllDevices = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole('user');
      
      // Reset init for fresh login
      resetInitState();
      
      // Sign out globally - this will invalidate all refresh tokens
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Sign out all devices failed:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
      await fetchUserRole(user.id);
    }
  };


  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'moderator';
  const isApproved = profile?.is_approved === true || isAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      userRole,
      isAdmin,
      isSuperAdmin,
      isAuthenticated: !!session,
      isApproved,
      isOffline,
      authState,
      signOut,
      signOutAllDevices,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
