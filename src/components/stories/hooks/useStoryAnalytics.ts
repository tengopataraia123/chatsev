import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const MIN_VIEW_TIME_PHOTO = 3; // seconds
const MIN_VIEW_TIME_VIDEO = 5; // seconds

export const useStoryAnalytics = (storyId: string, storyType: 'photo' | 'video' | 'text', duration: number) => {
  const { user } = useAuth();
  const watchTimeRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const recordedRef = useRef(false);
  const [isViewed, setIsViewed] = useState(false);

  // Start tracking
  const startTracking = useCallback(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, []);

  // Pause tracking
  const pauseTracking = useCallback(() => {
    if (startTimeRef.current !== null) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      watchTimeRef.current += elapsed;
      startTimeRef.current = null;
    }
  }, []);

  // Record view
  const recordView = useCallback(async (completed: boolean = false) => {
    if (!user?.id || !storyId || recordedRef.current) return;

    // Pause to get final time
    pauseTracking();

    const watchTime = Math.floor(watchTimeRef.current);
    const minTime = storyType === 'video' ? MIN_VIEW_TIME_VIDEO : MIN_VIEW_TIME_PHOTO;

    // Only record if watched minimum time
    if (watchTime < minTime && !completed) return;

    recordedRef.current = true;
    setIsViewed(true);

    try {
      await supabase
        .from('story_analytics')
        .upsert({
          story_id: storyId,
          viewer_id: user.id,
          watch_time_seconds: watchTime,
          completed: completed || watchTime >= duration
        } as any, {
          onConflict: 'story_id,viewer_id'
        });

      // Also record in story_views for backward compatibility
      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          user_id: user.id,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'story_id,user_id'
        });

    } catch (error) {
      console.error('Error recording story view:', error);
    }
  }, [user?.id, storyId, storyType, duration, pauseTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!recordedRef.current && watchTimeRef.current > 0) {
        recordView();
      }
    };
  }, [recordView]);

  // Reset for new story
  const reset = useCallback(() => {
    watchTimeRef.current = 0;
    startTimeRef.current = null;
    recordedRef.current = false;
    setIsViewed(false);
  }, []);

  return {
    startTracking,
    pauseTracking,
    recordView,
    reset,
    isViewed
  };
};
