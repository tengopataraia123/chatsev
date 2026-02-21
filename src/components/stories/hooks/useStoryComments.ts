import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useStoryComments = (storyId: string, storyOwnerId: string) => {
  const { user } = useAuth();
  const [commentsCount, setCommentsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch comments count
  const fetchCommentsCount = useCallback(async () => {
    if (!storyId) return;

    const { count, error } = await supabase
      .from('story_comments')
      .select('id', { count: 'exact', head: true })
      .eq('story_id', storyId)
      .eq('is_deleted', false);

    if (!error && count !== null) {
      setCommentsCount(count);
    }
  }, [storyId]);

  useEffect(() => {
    fetchCommentsCount();
  }, [fetchCommentsCount]);

  // Add a comment
  const addComment = useCallback(async (text: string): Promise<boolean> => {
    if (!user?.id || !storyId || !text.trim()) return false;

    setLoading(true);
    try {
      // Insert comment
      const { error } = await supabase
        .from('story_comments')
        .insert({
          story_id: storyId,
          user_id: user.id,
          content: text.trim()
        });

      if (error) throw error;

      // Send notification to story owner (if not self)
      if (storyOwnerId !== user.id) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        // Check for recent notification to dedupe
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: recentNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', storyOwnerId)
          .eq('from_user_id', user.id)
          .eq('type', 'story_comment')
          .eq('related_id', storyId)
          .gte('created_at', twoMinutesAgo)
          .single();

        if (!recentNotif) {
          await supabase
            .from('notifications')
            .insert({
              user_id: storyOwnerId,
              type: 'story_comment',
              message: `${senderProfile?.username || 'მომხმარებელმა'} დაკომენტარა შენს სთორის`,
              from_user_id: user.id,
              related_id: storyId,
              is_read: false
            });
        }
      }

      setCommentsCount(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, storyId, storyOwnerId]);

  return {
    commentsCount,
    addComment,
    loading,
    refetch: fetchCommentsCount
  };
};
