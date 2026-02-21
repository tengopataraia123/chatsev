import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Map of activeTab to Georgian location names
const locationMap: Record<string, string> = {
  'home': 'მთავარი',
  'search': 'ძიება',
  'chat': 'მიმოწერა',
  'group-chat': 'ჩატი',
  'profile': 'პროფილი',
  'user-profile': 'პროფილი',
  'settings': 'პარამეტრები',
  'admin': 'ადმინ პანელი',
  'archive': 'არქივი',
  'points': 'ქულები',
  'subscribers': 'გამომწერები',
  'saved': 'შენახული',
  'photos': 'ფოტოები',
  'my-photos': 'ფოტოები',
  'all-photos': 'ფოტოები',
  'forums': 'ფორუმი',
  'music': 'მუსიკა',
  'quizzes': 'ვიქტორინები',
  'polls': 'გამოკითხვა',
  'marketplace': 'მარკეტი',
  'groups': 'ჯგუფები',
  'pages': 'გვერდები',
  'blogs': 'ბლოგები',
  'dating': 'გაცნობა',
  'online-users': 'online',
  'all-users': 'მომხმარებლები',
  'top-members': 'ტოპ წევრები',
  'games': 'თამაშები',
  'videos': 'ვიდეოები',
  'shop': 'მაღაზია',
  'live': 'ლაივი',
  'reels': 'რილსები',
  'friends-list': 'მეგობრები',
  'my-profile-info': 'ჩემი ინფო'
};

/**
 * Hook to track user's current location in the app
 * Updates the profiles.current_location field
 * @param activeTab - current active tab
 * @param userId - user ID (passed from parent to avoid duplicate useAuth calls)
 */
export const useLocationTracker = (activeTab: string, userId: string | undefined) => {
  const lastLocationRef = useRef<string>('');

  useEffect(() => {
    if (!userId) return;

    const location = locationMap[activeTab] || 'მთავარი';
    
    // Skip if location hasn't changed
    if (lastLocationRef.current === location) return;
    lastLocationRef.current = location;

    // Debounce location updates - delay by 3 seconds
    const timeoutId = setTimeout(() => {
      supabase
        .from('profiles')
        .update({ current_location: location })
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating location:', error);
          }
        });
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [activeTab, userId]);
};

/**
 * Get the display location name for an activeTab
 */
export const getLocationName = (activeTab: string): string => {
  return locationMap[activeTab] || 'მთავარი';
};
