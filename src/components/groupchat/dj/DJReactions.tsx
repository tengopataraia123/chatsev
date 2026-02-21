import { memo, useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJ_ROOM_ID } from './types';

interface DJReactionsProps {
  trackId: string | null;
  userId?: string;
  initialLikes?: number;
  initialDislikes?: number;
}

const DJReactions = memo(({ trackId, userId, initialLikes = 0, initialDislikes = 0 }: DJReactionsProps) => {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch user's reaction
  useEffect(() => {
    if (!trackId || !userId) return;
    
    const fetchReaction = async () => {
      const { data } = await supabase
        .from('dj_track_reactions')
        .select('reaction_type')
        .eq('room_id', DJ_ROOM_ID)
        .eq('track_id', trackId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data) {
        setUserReaction(data.reaction_type as 'like' | 'dislike');
      }
    };
    
    fetchReaction();
  }, [trackId, userId]);

  const handleReact = async (type: 'like' | 'dislike') => {
    if (!trackId || !userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dj-youtube', {
        body: {
          action: 'react',
          track_id: trackId,
          user_id: userId,
          reaction_type: type,
          room_id: DJ_ROOM_ID
        }
      });
      
      if (error) throw error;
      
      if (data?.likes !== undefined) {
        setLikes(data.likes);
        setDislikes(data.dislikes);
      }
      
      // Toggle reaction
      if (userReaction === type) {
        setUserReaction(null);
      } else {
        setUserReaction(type);
      }
    } catch (e) {
      console.error('Reaction error:', e);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!trackId) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={userReaction === 'like' ? 'default' : 'ghost'}
        className={`h-7 px-2 gap-1 ${userReaction === 'like' ? 'bg-green-500/20 hover:bg-green-500/30 text-green-500' : ''}`}
        onClick={() => handleReact('like')}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ThumbsUp className="w-3.5 h-3.5" />
        )}
        <span className="text-xs">{likes}</span>
      </Button>
      
      <Button
        size="sm"
        variant={userReaction === 'dislike' ? 'default' : 'ghost'}
        className={`h-7 px-2 gap-1 ${userReaction === 'dislike' ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500' : ''}`}
        onClick={() => handleReact('dislike')}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ThumbsDown className="w-3.5 h-3.5" />
        )}
        <span className="text-xs">{dislikes}</span>
      </Button>
    </div>
  );
});

DJReactions.displayName = 'DJReactions';

export default DJReactions;
