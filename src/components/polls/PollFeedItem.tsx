import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PollCardFB from './PollCardFB';

interface Poll {
  id: string;
  user_id: string;
  title: string | null;
  question: string;
  options: string[];
  is_anonymous: boolean;
  allow_multiple_choice: boolean;
  allow_change_vote: boolean;
  allow_user_options: boolean;
  max_selections: number;
  expires_at: string | null;
  show_results_mode: string;
  allow_comments: boolean;
  visibility: string;
  status: string;
  is_closed: boolean;
  created_at: string;
  share_count: number;
  context_type?: string;
  is_pinned?: boolean;
}

interface PollFeedItemProps {
  pollId: string;
  onUserClick?: (userId: string) => void;
  onDelete?: (pollId: string) => void;
  isSuperAdmin?: boolean;
  onPinToggle?: () => void;
}

const PollFeedItem = ({ pollId, onUserClick, onDelete, isSuperAdmin, onPinToggle }: PollFeedItemProps) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  const fetchPoll = async () => {
    const { data: pollData, error } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .in('status', ['approved', 'pending'])
      .single();

    if (error || !pollData) {
      setLoading(false);
      return;
    }

    const transformedPoll: Poll = {
      ...pollData,
      options: Array.isArray(pollData.options) ? pollData.options as string[] : [],
      is_anonymous: pollData.is_anonymous ?? false,
      allow_multiple_choice: pollData.allow_multiple_choice ?? false,
      allow_change_vote: pollData.allow_change_vote ?? false,
      allow_user_options: pollData.allow_user_options ?? false,
      max_selections: (pollData as any).max_selections ?? 3,
      show_results_mode: pollData.show_results_mode ?? 'after_vote',
      allow_comments: pollData.allow_comments ?? true,
      visibility: pollData.visibility ?? 'everyone',
      is_closed: pollData.is_closed ?? false,
      share_count: (pollData as any).share_count ?? 0,
      is_pinned: pollData.is_pinned ?? false,
    };

    setPoll(transformedPoll);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('user_id', pollData.user_id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-secondary rounded-full" />
          <div className="space-y-2">
            <div className="w-24 h-3 bg-secondary rounded" />
            <div className="w-16 h-2 bg-secondary rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="w-3/4 h-4 bg-secondary rounded" />
          <div className="w-1/2 h-4 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  return (
    <PollCardFB
      poll={poll}
      profile={profile}
      onUserClick={onUserClick}
      onDelete={onDelete}
      isSuperAdmin={isSuperAdmin}
      onPinToggle={onPinToggle}
    />
  );
};

export default PollFeedItem;
