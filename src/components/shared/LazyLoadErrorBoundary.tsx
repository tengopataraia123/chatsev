import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Specialized ErrorBoundary for lazy-loaded components
 * Handles "Failed to fetch dynamically imported module" errors
 * by offering a page refresh (which fixes stale module cache issues)
 */
class LazyLoadErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LazyLoadErrorBoundary] caught:', error.message);
    
    // If it's a module loading error, the best fix is usually a page refresh
    const isModuleError = 
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Loading chunk');
    
    if (isModuleError) {
      // Store that we've seen this error to prevent infinite refresh loops
      const refreshKey = 'lazy_module_refresh_' + Date.now().toString().slice(0, -4);
      const lastRefresh = sessionStorage.getItem('lazy_module_last_refresh');
      const now = Date.now();
      
      // Only auto-refresh if we haven't refreshed in the last 10 seconds
      if (!lastRefresh || now - parseInt(lastRefresh) > 10000) {
        sessionStorage.setItem('lazy_module_last_refresh', now.toString());
        window.location.reload();
        return;
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem('lazy_module_last_refresh');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100px] flex flex-col items-center justify-center p-4 text-center">
          <WifiOff className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            კომპონენტის ჩატვირთვა ვერ მოხერხდა
          </p>
          <Button size="sm" onClick={this.handleReload}>
            <RefreshCw className="w-4 h-4 mr-2" />
            განახლება
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
