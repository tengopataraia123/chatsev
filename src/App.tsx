import { useEffect, Suspense, memo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
// CallProvider removed - calling feature disabled
import { AdViolationAlert } from "@/components/admin/AdViolationAlert";
import { DJPlayerProvider } from "@/contexts/DJPlayerContext";
import useDisableMediaSession from "@/hooks/useDisableMediaSession";
import InAppNotificationBanner from "@/components/notifications/InAppNotificationBanner";
import FCMInitializer from "@/components/notifications/FCMInitializer";

// Eager load all pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import MoviesPage from "./components/movies/MoviesPage";
import HashtagView from "./components/hashtag/HashtagView";
// Memoized simple loader for fastest render with inline SVG logo
const PageLoader = memo(() => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
    {/* Inline SVG for immediate render without lazy load */}
    <div className="animate-pulse">
      <svg
        width={64}
        height={64}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="5" y="5" width="90" height="90" rx="24" fill="hsl(var(--foreground))" />
        <path
          d="M50 75 C50 75, 25 58, 25 42 C25 34, 31 28, 38 28 C43 28, 47 31, 50 35 C53 31, 57 28, 62 28 C69 28, 75 34, 75 42 C75 58, 50 75, 50 75Z"
          fill="hsl(var(--background))"
        />
        <circle cx="40" cy="46" r="3" fill="hsl(var(--foreground))" opacity="0.6" />
        <circle cx="50" cy="46" r="3" fill="hsl(var(--foreground))" opacity="0.6" />
        <circle cx="60" cy="46" r="3" fill="hsl(var(--foreground))" opacity="0.6" />
      </svg>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xl font-extrabold text-foreground italic uppercase tracking-tight">CHATSEV</span>
    </div>
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));
PageLoader.displayName = 'PageLoader';

// Ultra-optimized query client with aggressive caching for fastest loading
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour - minimize refetching
      gcTime: 1000 * 60 * 60 * 8, // 8 hours cache
      retry: 1,
      retryDelay: 300,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      networkMode: 'offlineFirst',
      structuralSharing: true,
    },
    mutations: { 
      retry: 1,
      retryDelay: 300,
      networkMode: 'offlineFirst',
    },
  },
});

// Apply theme to DOM
const applyTheme = (theme: string) => {
  const root = document.documentElement;
  root.classList.remove('dark', 'theme-facebook', 'theme-yellow');
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'facebook') {
    root.classList.add('theme-facebook');
  } else if (theme === 'yellow') {
    root.classList.add('theme-yellow');
  }
};

// Initialize theme on app load from localStorage (fast)
// Default to Facebook theme for best UX
const initTheme = () => {
  const savedTheme = localStorage.getItem('app-theme') || 'facebook';
  applyTheme(savedTheme);
};

// Run immediately
initTheme();

// Load theme from Supabase for logged-in users (non-blocking)
const loadThemeFromSupabase = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.theme) {
        localStorage.setItem('app-theme', data.theme);
        applyTheme(data.theme);
      }
    }
  } catch {
    // Silent fail - use localStorage theme
  }
};

const App = () => {
  // Disable browser Media Session to prevent phone notification controls
  useDisableMediaSession();
  
  useEffect(() => {
    initTheme();
    
    // Load theme from Supabase after initial render
    const timer = setTimeout(() => {
      loadThemeFromSupabase();
    }, 500);
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadThemeFromSupabase();
      }
    });
    
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <DJPlayerProvider>
                <Toaster />
                <Sonner />
                <InAppNotificationBanner />
                <FCMInitializer />
                <BrowserRouter>
                  <AdViolationAlert />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/movies/*" element={<MoviesPage />} />
                      <Route path="/hashtag/:tag" element={<HashtagView />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/install" element={<Install />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
            </DJPlayerProvider>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
