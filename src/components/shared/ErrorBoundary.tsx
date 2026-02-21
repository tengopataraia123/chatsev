import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxAutoRetries = 2;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Auto-retry for network errors (only a few times)
    const isNetworkError = error.message?.includes('fetch') || 
                           error.message?.includes('network') ||
                           error.message?.includes('Failed to load');
    
    if (isNetworkError && this.state.retryCount < this.maxAutoRetries) {
      this.retryTimeoutId = setTimeout(() => {
        this.setState(prev => ({ 
          hasError: false, 
          error: null, 
          retryCount: prev.retryCount + 1 
        }));
      }, 2000 * (this.state.retryCount + 1)); // Exponential backoff
    }
  }

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, retryCount: 0 });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                             this.state.error?.message?.includes('network');

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
          {isNetworkError ? (
            <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
          ) : (
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          )}
          <h2 className="text-lg font-semibold mb-2">
            {isNetworkError ? 'კავშირი ვერ მოხერხდა' : 'დაფიქსირდა შეცდომა'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {isNetworkError 
              ? 'ჩატვირთვას ძალიან დიდი დრო სჭირდება. შე-ამოწმეთ ინტერნეტ კავშირი.' 
              : 'გვერდის ჩატვირთვა ვერ მოხერხდა'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              თავიდან ცდა
            </Button>
            <Button onClick={this.handleReload} className="bg-primary">
              გვერდის განახლება
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
