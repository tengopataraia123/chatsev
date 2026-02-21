import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { StoryReaction } from '../types';
import { getStoryReactionEmoji, getStoryReactionLabel } from '../types';

export const useStoryReactions = (storyId: string, storyOwnerId?: string) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<StoryReaction[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reactionsCount, setReactionsCount] = useState(0);
  const lastNotificationRef = useRef<string | null>(null);

  // Fetch reactions
  const fetchReactions = useCallback(async () => {
    if (!storyId) return;

    const { data, error } = await supabase
      .from('story_reactions')
      .select('*')
      .eq('story_id', storyId);

    if (!error && data) {
      setReactions(data);
      setReactionsCount(data.length);
      // Find user's reaction
      const myReaction = data.find(r => r.user_id === user?.id);
      setUserReaction(myReaction?.reaction_type || null);
    }
  }, [storyId, user?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Send notification to story owner (with deduplication)
  const sendReactionNotification = useCallback(async (reactionType: string) => {
    if (!storyOwnerId || !user?.id || storyOwnerId === user.id) return;

    try {
      // Get reactor's username
      const { data: reactorProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      const emoji = getStoryReactionEmoji(reactionType);
      const label = getStoryReactionLabel(reactionType);

      // Check for recent notification to dedupe (within 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: recentNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', storyOwnerId)
        .eq('from_user_id', user.id)
        .eq('type', 'story_reaction')
        .eq('related_id', storyId)
        .gte('created_at', twoMinutesAgo)
        .single();

      if (recentNotif) {
        // Update existing notification
        await supabase
          .from('notifications')
          .update({
            message: `${reactorProfile?.username || 'მომხმარებელმა'} ${emoji} ${label} რეაქცია დატოვა შენს სთორიზე`,
            is_read: false,
            created_at: new Date().toISOString()
          })
          .eq('id', recentNotif.id);
      } else {
        // Create new notification
        await supabase
          .from('notifications')
          .insert({
            user_id: storyOwnerId,
            type: 'story_reaction',
            message: `${reactorProfile?.username || 'მომხმარებელმა'} ${emoji} ${label} რეაქცია დატოვა შენს სთორიზე`,
            from_user_id: user.id,
            related_id: storyId,
            is_read: false
          });
      }

      lastNotificationRef.current = reactionType;
    } catch (error) {
      console.error('Error sending reaction notification:', error);
    }
  }, [storyOwnerId, user?.id, storyId]);

  // Add, update, or remove reaction (FB-style)
  const addReaction = useCallback(async (reactionType: string) => {
    if (!user?.id || !storyId) return;

    setLoading(true);
    
    // Optimistic update
    const prevReaction = userReaction;
    const prevCount = reactionsCount;

    try {
      if (!reactionType || reactionType === '') {
        // Remove reaction
        setUserReaction(null);
        setReactionsCount(prev => Math.max(0, prev - 1));
        setReactions(prev => prev.filter(r => r.user_id !== user.id));

        await supabase
          .from('story_reactions')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', user.id);
      } else if (userReaction === reactionType) {
        // Toggle off - same reaction
        setUserReaction(null);
        setReactionsCount(prev => Math.max(0, prev - 1));
        setReactions(prev => prev.filter(r => r.user_id !== user.id));

        await supabase
          .from('story_reactions')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', user.id);
      } else {
        // Upsert reaction
        const isNew = !userReaction;
        setUserReaction(reactionType);
        if (isNew) {
          setReactionsCount(prev => prev + 1);
        }
        
        setReactions(prev => {
          const filtered = prev.filter(r => r.user_id !== user.id);
          return [...filtered, {
            id: 'temp-' + Date.now(),
            story_id: storyId,
            user_id: user.id,
            reaction_type: reactionType,
            created_at: new Date().toISOString()
          }];
        });

        const { error } = await supabase
          .from('story_reactions')
          .upsert({
            story_id: storyId,
            user_id: user.id,
            reaction_type: reactionType,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'story_id,user_id'
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
      // Rollback on error
      setUserReaction(prevReaction);
      setReactionsCount(prevCount);
      fetchReactions();
    } finally {
      setLoading(false);
    }
  }, [storyId, user?.id, userReaction, reactionsCount, storyOwnerId, sendReactionNotification, fetchReactions]);

  // Get reaction counts by type
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    reactions,
    userReaction,
    reactionCounts,
    reactionsCount,
    addReaction,
    loading,
    refetch: fetchReactions
  };
};
