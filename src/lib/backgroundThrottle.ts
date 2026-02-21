/**
 * Background Throttle Manager
 * Automatically pauses/resumes expensive work when the app is backgrounded.
 * Integrates with React Query, Supabase realtime, and custom intervals.
 */

import { getPageVisibility, onVisibilityChange } from './mobilePerformance';

type CleanupFn = () => void;
type RestoreFn = () => void;

interface ThrottleEntry {
  pause: () => void;
  resume: () => void;
}

const entries = new Map<string, ThrottleEntry>();
let isThrottled = false;

/**
 * Register a pausable resource. Returns unregister function.
 */
export const registerThrottleable = (
  id: string,
  entry: ThrottleEntry
): CleanupFn => {
  entries.set(id, entry);
  // If already throttled, pause immediately
  if (isThrottled) entry.pause();
  return () => {
    entry.pause();
    entries.delete(id);
  };
};

/**
 * Pause all registered resources
 */
const pauseAll = () => {
  isThrottled = true;
  entries.forEach(e => e.pause());
};

/**
 * Resume all registered resources
 */
const resumeAll = () => {
  isThrottled = false;
  entries.forEach(e => e.resume());
};

// Auto-wire to visibility
onVisibilityChange((visible) => {
  if (visible) resumeAll();
  else pauseAll();
});

/**
 * Create a smart interval that auto-pauses when backgrounded.
 * Replacement for raw setInterval.
 */
export const createSmartInterval = (
  callback: () => void,
  ms: number,
  id?: string
): CleanupFn => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const key = id || `interval_${Date.now()}_${Math.random()}`;

  const start = () => {
    if (intervalId) return;
    intervalId = setInterval(callback, ms);
  };
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  start();
  return registerThrottleable(key, { pause: stop, resume: start });
};

export const isBackgrounded = () => isThrottled;
