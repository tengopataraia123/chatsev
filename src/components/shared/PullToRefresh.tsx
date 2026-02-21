import { useState, useEffect, useRef, ReactNode, useCallback, memo, RefObject } from 'react';

interface PullToRefreshConfig {
  threshold?: number;
  maxPull?: number;
  resistance?: number;
  cooldownMs?: number;
  indicatorSize?: number;
}

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
  config?: PullToRefreshConfig;
  disabled?: boolean;
  /** Ref to the scrollable element to check scrollTop on */
  scrollRef?: RefObject<HTMLElement>;
  /** @deprecated Use scrollRef instead */
  scrollableAncestor?: boolean;
}

const DEFAULT_CONFIG: Required<PullToRefreshConfig> = {
  threshold: 55,
  maxPull: 70,
  resistance: 0.35,
  cooldownMs: 1200,
  indicatorSize: 22,
};

const PullToRefresh = memo(({ 
  children, 
  onRefresh, 
  config = {},
  disabled = false,
  scrollRef,
  scrollableAncestor = false
}: PullToRefreshProps) => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);
  
  const startY = useRef(0);
  const isPulling = useRef(false);
  const lastRefreshTime = useRef(0);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pullDistanceRef = useRef(0);

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const isAtTop = useCallback((): boolean => {
    // If scrollRef is provided, check that element
    if (scrollRef?.current) {
      return scrollRef.current.scrollTop <= 2;
    }
    
    // Legacy scrollableAncestor mode
    if (scrollableAncestor) {
      let el = containerRef.current?.parentElement;
      while (el) {
        if (el.scrollHeight > el.clientHeight + 2) {
          return el.scrollTop <= 2;
        }
        el = el.parentElement;
      }
      return window.scrollY <= 2;
    }
    
    // Default: check window + parents + children
    if (window.scrollY > 2) return false;
    
    let el = containerRef.current?.parentElement;
    while (el) {
      if (el.scrollTop > 2) return false;
      el = el.parentElement;
    }
    
    if (containerRef.current) {
      const directChildren = containerRef.current.children;
      for (let i = 0; i < directChildren.length; i++) {
        const child = directChildren[i] as HTMLElement;
        if (child.scrollHeight > child.clientHeight + 2 && child.scrollTop > 2) {
          return false;
        }
      }
    }
    
    return true;
  }, [scrollableAncestor, scrollRef]);

  const doRefresh = useCallback(async () => {
    if (refreshing || disabled) return;
    
    const now = Date.now();
    if (now - lastRefreshTime.current < settings.cooldownMs) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setShowIndicator(false);
      return;
    }
    
    lastRefreshTime.current = now;
    setRefreshing(true);
    triggerHaptic();
    
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        window.location.reload();
        return;
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 350));
    
    setRefreshing(false);
    pullDistanceRef.current = 0;
    setPullDistance(0);
    setShowIndicator(false);
  }, [onRefresh, refreshing, disabled, settings.cooldownMs, triggerHaptic]);

  useEffect(() => {
    if (disabled) return;

    const updatePull = (val: number) => {
      pullDistanceRef.current = val;
      setPullDistance(val);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (!isAtTop()) {
        isPulling.current = false;
        return;
      }
      
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      
      if (!isAtTop()) {
        isPulling.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          updatePull(0);
          setShowIndicator(false);
        });
        return;
      }

      const rawDiff = e.touches[0].clientY - startY.current;

      if (rawDiff <= 0) {
        if (pullDistanceRef.current > 0) {
          rafRef.current = requestAnimationFrame(() => {
            updatePull(0);
            setShowIndicator(false);
          });
        }
        return;
      }

      const resistedPull = rawDiff * settings.resistance;
      const cappedPull = Math.min(resistedPull, settings.maxPull);
      
      if (cappedPull > 5) {
        e.preventDefault();
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updatePull(cappedPull);
        setShowIndicator(cappedPull >= 10);
      });
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistanceRef.current >= settings.threshold && !refreshing) {
        doRefresh();
      } else {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          updatePull(0);
          setShowIndicator(false);
        });
      }
    };

    // Attach to scrollRef element if available (critical for intercepting touches on scrollable areas)
    const target = scrollRef?.current || containerRef.current || document;
    
    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [refreshing, disabled, isAtTop, doRefresh, settings.threshold, settings.resistance, settings.maxPull, scrollRef]);

  const progress = Math.min(pullDistance / settings.threshold, 1);
  const indicatorOpacity = showIndicator || refreshing ? Math.max(progress, refreshing ? 1 : 0.3) : 0;

  return (
    <div ref={containerRef} className="relative h-full flex flex-col">
      {/* Indicator */}
      <div 
        className="fixed left-1/2 z-[9999] pointer-events-none"
        style={{ 
          top: `${Math.max(8, Math.min(pullDistance - 10, 30))}px`,
          transform: 'translateX(-50%)',
          opacity: indicatorOpacity,
          transition: refreshing ? 'none' : 'opacity 150ms ease-out',
        }}
      >
        <div 
          className="flex items-center justify-center bg-card border border-border rounded-full shadow-lg"
          style={{
            width: `${settings.indicatorSize + 8}px`,
            height: `${settings.indicatorSize + 8}px`,
          }}
        >
          <svg
            className={refreshing ? 'animate-spin' : ''}
            style={{
              width: `${settings.indicatorSize}px`,
              height: `${settings.indicatorSize}px`,
              transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
              transition: refreshing ? 'none' : 'transform 50ms linear',
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground/30" />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="text-primary"
              style={{ strokeDasharray: refreshing ? undefined : `${progress * 63} 63` }}
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 min-h-0 flex flex-col"
        style={{ 
          transform: pullDistance > 0 && !refreshing 
            ? `translateY(${Math.min(pullDistance * 0.3, 20)}px)` 
            : 'translateY(0)',
          transition: isPulling.current ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
});

PullToRefresh.displayName = 'PullToRefresh';

export default PullToRefresh;
