import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ReactionCounts {
  [key: string]: number;
}

export type TargetType = 'story' | 'message' | 'comment' | 'post' | 'room_message' | 'private_message' | 'reply';

interface UseUniversalReactionsOptions {
  targetType: TargetType;
  targetId: string;
  contentOwnerId?: string;
  onReactionChange?: (reaction: string | null, counts: ReactionCounts) => void;
}

export const useUniversalReactions = ({
  targetType,
  targetId,
  contentOwnerId,
  onReactionChange,
}: UseUniversalReactionsOptions) => {
  const { user } = useAuth();
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reactions
  const fetchReactions = useCallback(async () => {
    if (!targetId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('universal_reactions')
        .select('reaction_type, user_id')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (fetchError) throw fetchError;

      // Count reactions
      const counts: ReactionCounts = {};
      let userReaction: string | null = null;
      
      data?.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        if (user?.id && r.user_id === user.id) {
          userReaction = r.reaction_type;
        }
      });

      setReactionCounts(counts);
      setMyReaction(userReaction);
    } catch (err) {
      console.error('Error fetching reactions:', err);
      setError('შეცდომა რეაქციების ჩატვირთვისას');
    }
  }, [targetId, targetType, user?.id]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!targetId) return;
    
    fetchReactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`universal-reactions-${targetType}-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'universal_reactions',
          filter: `target_id=eq.${targetId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, targetType, fetchReactions]);

  // Toggle reaction
  const toggleReaction = useCallback(async (reactionType: string) => {
    if (!user?.id || loading) return;

    setLoading(true);
    setError(null);
    
    const previousReaction = myReaction;
    const previousCounts = { ...reactionCounts };

    try {
      if (myReaction === reactionType) {
        // Remove reaction (toggle off)
        setMyReaction(null);
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
        }));

        const { error: deleteError } = await supabase
          .from('universal_reactions')
          .delete()
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        onReactionChange?.(null, reactionCounts);
      } else {
        // Add or change reaction
        const newCounts = { ...reactionCounts };
        if (myReaction) {
          newCounts[myReaction] = Math.max(0, (newCounts[myReaction] || 0) - 1);
        }
        newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
        
        setMyReaction(reactionType);
        setReactionCounts(newCounts);

        const { error: upsertError } = await supabase
          .from('universal_reactions')
          .upsert({
            target_type: targetType,
            target_id: targetId,
            user_id: user.id,
            reaction_type: reactionType,
          }, {
            onConflict: 'target_type,target_id,user_id',
          });

        if (upsertError) throw upsertError;
        onReactionChange?.(reactionType, newCounts);

        // Send notification if not own content
        if (contentOwnerId && contentOwnerId !== user.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .single();

          const emoji = getReactionEmoji(reactionType);
          const typeLabel = getTypeLabel(targetType);

          await supabase
            .from('notifications')
            .insert({
              user_id: contentOwnerId,
              from_user_id: user.id,
              type: `${targetType}_reaction`,
              message: `${profile?.username || 'მომხმარებელმა'} ${emoji} რეაქცია დატოვა შენს ${typeLabel}`,
              related_id: targetId,
              is_read: false,
            });
        }
      }
    } catch (err) {
      console.error('Error updating reaction:', err);
      // Rollback on error
      setMyReaction(previousReaction);
      setReactionCounts(previousCounts);
      setError('შეცდომა რეაქციის შენახვისას');
    } finally {
      setLoading(false);
    }
  }, [user?.id, myReaction, reactionCounts, targetType, targetId, contentOwnerId, loading, onReactionChange]);

  // Helper: add 'like' reaction (for short click)
  const addLike = useCallback(() => toggleReaction('like'), [toggleReaction]);

  // Helper: remove any reaction
  const removeReaction = useCallback(async () => {
    if (!user?.id || !myReaction || loading) return;
    await toggleReaction(myReaction);
  }, [user?.id, myReaction, loading, toggleReaction]);

  // Total count
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  // Top reactions sorted by count
  const topReactions = Object.entries(reactionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return {
    myReaction,
    reactionCounts,
    totalReactions,
    topReactions,
    loading,
    error,
    toggleReaction,
    addLike,
    removeReaction,
    refetch: fetchReactions,
  };
};

// Helpers
const getReactionEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    like: '👍',
    love: '❤️',
    care: '🤗',
    haha: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡',
  };
  return emojis[type] || '👍';
};

const getTypeLabel = (type: TargetType): string => {
  const labels: Record<TargetType, string> = {
    story: 'სთორიზე',
    post: 'პოსტზე',
    comment: 'კომენტარზე',
    message: 'შეტყობინებაზე',
    room_message: 'შეტყობინებაზე',
    private_message: 'შეტყობინებაზე',
    reply: 'პასუხზე',
  };
  return labels[type] || 'კონტენტზე';
};

export default useUniversalReactions;
