import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type PresenceTable = 'live_presence' | 'games_presence' | 'dating_presence' | 'movies_presence' | 'quiz_v2_presence';

// Hook to track user presence in a feature
export const useFeaturePresence = (table: PresenceTable, isActive: boolean) => {
  const { user } = useAuth();

  const updatePresence = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from(table)
        .upsert(
          { user_id: user.id, last_active_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
    }
  }, [user?.id, table]);

  const removePresence = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id);
    } catch (error) {
      console.error(`Error removing ${table}:`, error);
    }
  }, [user?.id, table]);

  useEffect(() => {
    if (!isActive || !user?.id) return;

    // Initial presence update
    updatePresence();

    // Heartbeat every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    return () => {
      clearInterval(interval);
      // Don't remove on unmount - let the 5-minute timeout handle it
    };
  }, [isActive, user?.id, updatePresence]);

  return { removePresence };
};

// Hook to get presence count for a feature (users active in last 5 minutes)
export const useFeaturePresenceCount = (table: PresenceTable) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { count: activeCount, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', fiveMinutesAgo);

      if (!error && activeCount !== null) {
        setCount(activeCount);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Update every 60 seconds (was 10)

    return () => clearInterval(interval);
  }, [table]);

  return count;
};

// Convenience hooks for each feature
export const useLivePresence = (isActive: boolean) => useFeaturePresence('live_presence', isActive);
export const useGamesPresence = (isActive: boolean) => useFeaturePresence('games_presence', isActive);
export const useDatingPresence = (isActive: boolean) => useFeaturePresence('dating_presence', isActive);
export const useMoviesPresence = (isActive: boolean) => useFeaturePresence('movies_presence', isActive);
export const useQuizPresence = (isActive: boolean) => useFeaturePresence('quiz_v2_presence', isActive);

export const useLivePresenceCount = () => useFeaturePresenceCount('live_presence');
export const useGamesPresenceCount = () => useFeaturePresenceCount('games_presence');
export const useDatingPresenceCount = () => useFeaturePresenceCount('dating_presence');
export const useMoviesPresenceCount = () => useFeaturePresenceCount('movies_presence');
export const useQuizPresenceCount = () => useFeaturePresenceCount('quiz_v2_presence');
