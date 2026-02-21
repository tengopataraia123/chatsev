import { useEffect, useCallback } from 'react';

interface UseBackNavigationProps {
  activeTab: string;
  viewUserId: string | null;
  onNavigateBack: () => void;
  isMainView: boolean;
}

export function useBackNavigation({
  activeTab,
  viewUserId,
  onNavigateBack,
  isMainView
}: UseBackNavigationProps) {
  
  // Push state when navigating to sub-views
  useEffect(() => {
    // Don't push state for main view
    if (isMainView) return;
    
    // Push a history state for current view
    const state = { 
      tab: activeTab, 
      userId: viewUserId,
      isSubView: true 
    };
    
    // Check if we already have this state to avoid duplicate pushes
    if (window.history.state?.tab !== activeTab || window.history.state?.userId !== viewUserId) {
      window.history.pushState(state, '', window.location.href);
    }
  }, [activeTab, viewUserId, isMainView]);

  // Handle popstate event (back button)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we're not on main view, navigate back within the app
      if (!isMainView) {
        event.preventDefault();
        onNavigateBack();
        
        // Push a new state to prevent actual back navigation
        window.history.pushState({ tab: 'home', isSubView: false }, '', window.location.href);
      } else {
        // On main view, prevent back navigation by pushing state again
        event.preventDefault();
        window.history.pushState({ tab: 'home', isSubView: false }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initialize history state on mount
    if (!window.history.state?.tab) {
      window.history.replaceState({ tab: activeTab, isSubView: !isMainView }, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMainView, onNavigateBack, activeTab]);
}
