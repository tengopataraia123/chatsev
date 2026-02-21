import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useStoryMute = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [hiddenUsers, setHiddenUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch muted and hidden users
  const fetchMuteSettings = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [mutedRes, hiddenRes] = await Promise.all([
        supabase
          .from('story_mutes')
          .select('muted_user_id')
          .eq('user_id', user.id),
        supabase
          .from('story_hidden')
          .select('hidden_user_id')
          .eq('user_id', user.id)
      ]);

      if (mutedRes.data) {
        setMutedUsers(mutedRes.data.map(m => m.muted_user_id));
      }
      if (hiddenRes.data) {
        setHiddenUsers(hiddenRes.data.map(h => h.hidden_user_id));
      }
    } catch (error) {
      console.error('Error fetching mute settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMuteSettings();
  }, [fetchMuteSettings]);

  // Mute user's stories
  const muteUser = useCallback(async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('story_mutes')
        .insert({
          user_id: user.id,
          muted_user_id: targetUserId
        } as any);

      if (error) throw error;

      setMutedUsers(prev => [...prev, targetUserId]);
      toast({ title: 'წარმატება', description: 'სთორები დამუტებულია' });
    } catch (error: any) {
      if (error.code === '23505') {
        // Already muted
        return;
      }
      console.error('Error muting user:', error);
      toast({ title: 'შეცდომა', description: 'ვერ მოხერხდა', variant: 'destructive' });
    }
  }, [user?.id, toast]);

  // Unmute user
  const unmuteUser = useCallback(async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('story_mutes')
        .delete()
        .eq('user_id', user.id)
        .eq('muted_user_id', targetUserId);

      if (error) throw error;

      setMutedUsers(prev => prev.filter(id => id !== targetUserId));
      toast({ title: 'წარმატება', description: 'მიუტი მოხსნილია' });
    } catch (error) {
      console.error('Error unmuting user:', error);
      toast({ title: 'შეცდომა', description: 'ვერ მოხერხდა', variant: 'destructive' });
    }
  }, [user?.id, toast]);

  // Hide user's stories
  const hideUser = useCallback(async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('story_hidden')
        .insert({
          user_id: user.id,
          hidden_user_id: targetUserId
        } as any);

      if (error) throw error;

      setHiddenUsers(prev => [...prev, targetUserId]);
      toast({ title: 'წარმატება', description: 'სთორები დამალულია' });
    } catch (error: any) {
      if (error.code === '23505') {
        return;
      }
      console.error('Error hiding user:', error);
      toast({ title: 'შეცდომა', description: 'ვერ მოხერხდა', variant: 'destructive' });
    }
  }, [user?.id, toast]);

  // Unhide user
  const unhideUser = useCallback(async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('story_hidden')
        .delete()
        .eq('user_id', user.id)
        .eq('hidden_user_id', targetUserId);

      if (error) throw error;

      setHiddenUsers(prev => prev.filter(id => id !== targetUserId));
      toast({ title: 'წარმატება', description: 'სთორები აღარ არის დამალული' });
    } catch (error) {
      console.error('Error unhiding user:', error);
      toast({ title: 'შეცდომა', description: 'ვერ მოხერხდა', variant: 'destructive' });
    }
  }, [user?.id, toast]);

  // Check if user is muted
  const isUserMuted = useCallback((userId: string) => {
    return mutedUsers.includes(userId);
  }, [mutedUsers]);

  // Check if user is hidden
  const isUserHidden = useCallback((userId: string) => {
    return hiddenUsers.includes(userId);
  }, [hiddenUsers]);

  return {
    mutedUsers,
    hiddenUsers,
    muteUser,
    unmuteUser,
    hideUser,
    unhideUser,
    isUserMuted,
    isUserHidden,
    loading
  };
};
