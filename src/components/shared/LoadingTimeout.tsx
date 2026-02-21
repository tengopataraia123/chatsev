import { useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadingTimeoutProps {
  loading: boolean;
  timeout?: number; // milliseconds, default 10 seconds
  children: ReactNode;
  loadingMessage?: string;
  onRetry?: () => void;
}

const LoadingTimeout = ({ 
  loading, 
  timeout = 6000, // Faster default timeout
  children, 
  loadingMessage = 'იტვირთება...',
  onRetry 
}: LoadingTimeoutProps) => {
  const [timedOut, setTimedOut] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      setShowRetry(false);
      clearTimers();
      return;
    }

    // Show retry button after 3 seconds (faster)
    retryTimerRef.current = setTimeout(() => {
      if (loading) {
        setShowRetry(true);
      }
    }, 3000);

    // Show timeout screen after full timeout
    timerRef.current = setTimeout(() => {
      if (loading) {
        setTimedOut(true);
      }
    }, timeout);

    return clearTimers;
  }, [loading, timeout, clearTimers]);

  const handleRetry = useCallback(() => {
    setTimedOut(false);
    setShowRetry(false);
    onRetry?.();
  }, [onRetry]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  if (timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <AlertCircle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-lg font-semibold mb-2">კავშირი ვერ მოხერხდა</h2>
        <p className="text-sm text-muted-foreground mb-4">
          ჩატვირთვას ძალიან დიდი დრო სჭირდება. შეამოწმეთ ინტერნეტ კავშირი.
        </p>
        <div className="flex gap-2">
          {onRetry && (
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              თავიდან ცდა
            </Button>
          )}
          <Button onClick={handleReload}>
            გვერდის განახლება
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          {showRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReload}
              className="mt-1"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              განახლება
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LoadingTimeout;
