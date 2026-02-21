import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const VIEW_DELAY_MS = 1000; // 1 second before registering view

export const useStoryViews = (storyId: string, storyOwnerId: string) => {
  const { user } = useAuth();
  const [viewsCount, setViewsCount] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const registeredRef = useRef(false);

  // Fetch views count
  const fetchViewsCount = useCallback(async () => {
    if (!storyId) return;

    const { count, error } = await supabase
      .from('story_views')
      .select('id', { count: 'exact', head: true })
      .eq('story_id', storyId);

    if (!error && count !== null) {
      setViewsCount(count);
    }
  }, [storyId]);

  useEffect(() => {
    fetchViewsCount();
    registeredRef.current = false;
    setHasViewed(false);
  }, [fetchViewsCount, storyId]);

  // Start tracking view
  const startViewTracking = useCallback(() => {
    if (!user?.id || !storyId || registeredRef.current) return;
    
    // Don't track owner's own views
    if (user.id === storyOwnerId) {
      setHasViewed(true);
      return;
    }

    // Set timer for 1 second
    viewTimerRef.current = setTimeout(async () => {
      if (registeredRef.current) return;
      registeredRef.current = true;
      setHasViewed(true);

      try {
        // Upsert view (idempotent due to unique constraint)
        const { data, error: upsertError } = await supabase
          .from('story_views')
          .upsert({
            story_id: storyId,
            user_id: user.id,
            viewed_at: new Date().toISOString()
          }, {
            onConflict: 'story_id,user_id'
          })
          .select('id');

        if (!upsertError) {
          // Refetch accurate count from DB
          await fetchViewsCount();
        }
      } catch (error) {
        console.error('Error registering view:', error);
        registeredRef.current = false;
        setHasViewed(false);
      }
    }, VIEW_DELAY_MS);
  }, [user?.id, storyId, storyOwnerId]);

  // Cancel view tracking
  const cancelViewTracking = useCallback(() => {
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }
  }, []);

  // Reset state for new story (without cancelling timer - let the progress effect handle that)
  const resetState = useCallback(() => {
    registeredRef.current = false;
    setHasViewed(false);
  }, []);

  // Full reset (cancel timer + reset state)
  const reset = useCallback(() => {
    cancelViewTracking();
    registeredRef.current = false;
    setHasViewed(false);
  }, [cancelViewTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelViewTracking();
    };
  }, [cancelViewTracking]);

  return {
    viewsCount,
    hasViewed,
    startViewTracking,
    cancelViewTracking,
    reset,
    resetState,
    refetch: fetchViewsCount
  };
};
