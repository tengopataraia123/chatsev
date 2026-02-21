/**
 * ULTRA AVATAR SYSTEM - Settings Hook
 * Load and save avatar settings to localStorage or database
 */

import { useState, useEffect, useCallback } from 'react';
import { AvatarSettings, DEFAULT_AVATAR_SETTINGS } from '@/components/avatar/types';

const STORAGE_KEY = 'chatsev_avatar_settings';

interface UseAvatarSettingsOptions {
  userId?: string | null;
  persistToDatabase?: boolean;
}

/**
 * Hook to manage avatar settings
 * Supports localStorage for guests and database for authenticated users
 */
export function useAvatarSettings(options: UseAvatarSettingsOptions = {}) {
  const { userId, persistToDatabase = false } = options;
  
  const [settings, setSettings] = useState<AvatarSettings>(DEFAULT_AVATAR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_AVATAR_SETTINGS, ...parsed });
        }
        
        // If user is logged in and database persistence is enabled,
        // load from database (would override localStorage)
        if (userId && persistToDatabase) {
          // TODO: Load from Supabase profiles table when avatar_settings column is added
          // const { data } = await supabase
          //   .from('profiles')
          //   .select('avatar_settings')
          //   .eq('id', userId)
          //   .single();
          // if (data?.avatar_settings) {
          //   setSettings({ ...DEFAULT_AVATAR_SETTINGS, ...data.avatar_settings });
          // }
        }
      } catch (err) {
        console.error('Error loading avatar settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [userId, persistToDatabase]);

  // Save settings
  const saveSettings = useCallback(async (newSettings: Partial<AvatarSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    
    try {
      // Always save to localStorage for quick access
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      
      // If user is logged in and database persistence is enabled,
      // also save to database
      if (userId && persistToDatabase) {
        // TODO: Save to Supabase profiles table when avatar_settings column is added
        // await supabase
        //   .from('profiles')
        //   .update({ avatar_settings: merged })
        //   .eq('id', userId);
      }
    } catch (err) {
      console.error('Error saving avatar settings:', err);
      setError('Failed to save settings');
    }
  }, [settings, userId, persistToDatabase]);

  // Update single setting
  const updateSetting = useCallback(<K extends keyof AvatarSettings>(
    key: K, 
    value: AvatarSettings[K]
  ) => {
    saveSettings({ [key]: value });
  }, [saveSettings]);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_AVATAR_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    settings,
    loading,
    error,
    saveSettings,
    updateSetting,
    resetSettings,
  };
}

/**
 * Get cached avatar settings (synchronous, for use in render)
 */
export function getCachedAvatarSettings(): AvatarSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_AVATAR_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_AVATAR_SETTINGS;
}

export default useAvatarSettings;
