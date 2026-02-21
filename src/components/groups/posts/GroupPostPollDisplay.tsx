import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GroupPostPoll, GroupPostPollOption } from '../types';

interface GroupPostPollDisplayProps {
  poll: GroupPostPoll;
  postId: string;
  onRefresh: () => void;
}

const GroupPostPollDisplay = ({ poll, postId, onRefresh }: GroupPostPollDisplayProps) => {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);

  const hasVoted = (poll.user_votes?.length || 0) > 0;
  const isExpired = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
  const showResults = hasVoted || isExpired;

  const totalVotes = useMemo(() => {
    return poll.options?.reduce((sum, opt) => sum + opt.votes_count, 0) || 0;
  }, [poll.options]);

  const handleVote = useCallback(async (optionId: string) => {
    if (!user || voting || isExpired) return;
    setVoting(true);
    try {
      if (hasVoted && !poll.is_multiple_choice) {
        // Remove old vote first
        await supabase.from('group_post_poll_votes').delete()
          .eq('poll_id', poll.id).eq('user_id', user.id);
      }

      const alreadyVoted = poll.user_votes?.includes(optionId);
      if (alreadyVoted) {
        await supabase.from('group_post_poll_votes').delete()
          .eq('poll_id', poll.id).eq('option_id', optionId).eq('user_id', user.id);
      } else {
        await supabase.from('group_post_poll_votes').insert({
          poll_id: poll.id, option_id: optionId, user_id: user.id,
        });
      }
      onRefresh();
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setVoting(false);
    }
  }, [user, voting, isExpired, hasVoted, poll, onRefresh]);

  return (
    <div className="bg-secondary/30 rounded-xl p-3 space-y-3">
      <p className="font-medium text-sm text-foreground">{poll.question}</p>

      <div className="space-y-2">
        {poll.options?.map(opt => {
          const percentage = totalVotes > 0 ? Math.round((opt.votes_count / totalVotes) * 100) : 0;
          const isSelected = poll.user_votes?.includes(opt.id);

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={voting || (isExpired && !isSelected)}
              className={`w-full text-left rounded-lg p-2.5 text-sm relative overflow-hidden transition-colors ${
                isSelected ? 'border border-primary bg-primary/5' : 'border border-border hover:border-primary/50'
              }`}
            >
              {showResults && (
                <div className="absolute inset-0 bg-primary/10 transition-all" style={{ width: `${percentage}%` }} />
              )}
              <div className="relative flex items-center justify-between">
                <span className="text-foreground">{opt.option_text}</span>
                {showResults && (
                  <span className="text-xs text-muted-foreground ml-2">{percentage}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalVotes} ხმა</span>
        {poll.ends_at && (
          <span>{isExpired ? 'დასრულდა' : `ბოლო ვადა: ${new Date(poll.ends_at).toLocaleDateString('ka')}`}</span>
        )}
        {poll.is_multiple_choice && <span>მრავალი არჩევანი</span>}
      </div>
    </div>
  );
};

export default GroupPostPollDisplay;
