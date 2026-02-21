import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Announcement {
  id: string;
  title: string;
  content_html: string;
  priority: number;
  publish_start: string | null;
  publish_end: string | null;
  created_at: string;
  is_read: boolean;
  is_dismissed: boolean;
}

export const useAnnouncements = () => {
  const { user, isAuthenticated } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('get_active_announcements');
      
      if (error) throw error;
      
      const announcementList = (data || []) as Announcement[];
      setAnnouncements(announcementList);
      setUnreadCount(announcementList.filter(a => !a.is_read).length);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnnouncements();
    }
  }, [isAuthenticated, fetchAnnouncements]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('announcements-hook')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchAnnouncements]);

  const markAsRead = useCallback(async (announcementId: string) => {
    try {
      await supabase.rpc('mark_announcement_read', { 
        p_announcement_id: announcementId 
      });
      
      setAnnouncements(prev => 
        prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (error) {
      console.error('Error marking as read:', error);
      return false;
    }
  }, []);

  const dismiss = useCallback(async (announcementId: string) => {
    try {
      await supabase.rpc('dismiss_announcement', { 
        p_announcement_id: announcementId 
      });
      
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      
      return true;
    } catch (error) {
      console.error('Error dismissing:', error);
      return false;
    }
  }, []);

  return {
    announcements,
    loading,
    unreadCount,
    markAsRead,
    dismiss,
    refresh: fetchAnnouncements
  };
};

export default useAnnouncements;
