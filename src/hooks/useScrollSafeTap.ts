import { useRef, useCallback } from 'react';

/**
 * Hook that distinguishes taps from scrolls on mobile.
 * Returns onTouchStart/onTouchEnd handlers and a wrapper for onClick.
 * The onClick only fires if the touch didn't move more than `threshold` pixels.
 */
const MOVE_THRESHOLD = 10; // px

export const useScrollSafeTap = () => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const wasDragRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    wasDragRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      wasDragRef.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  /** Wraps a click handler so it only fires on real taps (not scroll drags) */
  const safeTap = useCallback((handler: () => void) => {
    return () => {
      // On desktop (no touch), always fire
      if (touchStartRef.current === null && !wasDragRef.current) {
        handler();
        return;
      }
      if (!wasDragRef.current) {
        handler();
      }
      wasDragRef.current = false;
    };
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, safeTap, wasDragRef };
};
