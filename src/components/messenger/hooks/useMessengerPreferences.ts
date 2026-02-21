/**
 * Hook for managing messenger preferences (privacy controls)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MessengerPreferences } from '../types';

const DEFAULT_PREFERENCES: Omit<MessengerPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  show_read_receipts: true,
  show_typing_indicator: true,
  notification_sounds: true,
  notification_previews: true,
  auto_play_videos: true,
  auto_play_gifs: true,
  hd_media_wifi_only: false,
};

export function useMessengerPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<MessengerPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('messenger_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const { data: newPrefs, error: createError } = await supabase
          .from('messenger_preferences')
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFERENCES,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        setPreferences(newPrefs);
      }
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const updatePreferences = useCallback(async (
    updates: Partial<Omit<MessengerPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    if (!user?.id || !preferences) return false;
    
    try {
      const { error } = await supabase
        .from('messenger_preferences')
        .update(updates)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      return false;
    }
  }, [user?.id, preferences]);

  // Toggle specific preference
  const toggleReadReceipts = useCallback(() => {
    return updatePreferences({ show_read_receipts: !preferences?.show_read_receipts });
  }, [preferences?.show_read_receipts, updatePreferences]);

  const toggleTypingIndicator = useCallback(() => {
    return updatePreferences({ show_typing_indicator: !preferences?.show_typing_indicator });
  }, [preferences?.show_typing_indicator, updatePreferences]);

  const toggleNotificationSounds = useCallback(() => {
    return updatePreferences({ notification_sounds: !preferences?.notification_sounds });
  }, [preferences?.notification_sounds, updatePreferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    toggleReadReceipts,
    toggleTypingIndicator,
    toggleNotificationSounds,
  };
}
