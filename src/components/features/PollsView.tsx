import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PollCardFB from '@/components/polls/PollCardFB';
import CreatePollModalFB from '@/components/polls/CreatePollModalFB';
import SharedPollCard from '@/components/polls/SharedPollCard';

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
}

interface PollShare {
  id: string;
  poll_id: string;
  user_id: string;
  caption: string | null;
  created_at: string;
}

interface FeedItem {
  type: 'poll' | 'shared_poll';
  poll: Poll;
  share?: PollShare;
  created_at: string;
}

interface PollsViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
  initialPollId?: string | null;
}

const PollsView = ({ onBack, onUserClick, initialPollId }: PollsViewProps) => {
  const { user, userRole } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [profiles, setProfiles] = useState<Map<string, { username: string; avatar_url: string | null; is_verified?: boolean; is_vip?: boolean }>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = ['super_admin', 'admin'].includes(userRole || '');

  useEffect(() => {
    fetchFeed();
  }, []);

  // Scroll to specific poll when initialPollId is provided
  useEffect(() => {
    if (initialPollId && !loading && feedItems.length > 0) {
      setTimeout(() => {
        const pollElement = document.getElementById(`poll-${initialPollId}`);
        if (pollElement) {
          pollElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          pollElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
          setTimeout(() => {
            pollElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
          }, 3000);
        }
      }, 300);
    }
  }, [initialPollId, loading, feedItems.length]);

  const fetchFeed = async () => {
    setLoading(true);

    // Fetch polls
    const { data: pollsData, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (pollsError) {
      console.error('Error fetching polls:', pollsError);
      setLoading(false);
      return;
    }

    // Fetch shares
    const { data: sharesData } = await supabase
      .from('poll_shares')
      .select('*')
      .order('created_at', { ascending: false });

    const pollsMap = new Map<string, Poll>();
    const transformedPolls: Poll[] = (pollsData || []).map(poll => {
      const p: Poll = {
        ...poll,
        options: Array.isArray(poll.options) ? poll.options as string[] : [],
        is_anonymous: poll.is_anonymous ?? false,
        allow_multiple_choice: poll.allow_multiple_choice ?? false,
        allow_change_vote: poll.allow_change_vote ?? false,
        allow_user_options: poll.allow_user_options ?? false,
        max_selections: poll.max_selections ?? 3,
        show_results_mode: poll.show_results_mode ?? 'after_vote',
        allow_comments: poll.allow_comments ?? true,
        visibility: poll.visibility ?? 'everyone',
        is_closed: poll.is_closed ?? false,
        share_count: poll.share_count ?? 0,
      };
      pollsMap.set(p.id, p);
      return p;
    });

    // Build feed items: original polls + shared polls
    const items: FeedItem[] = [];

    // Add original polls
    transformedPolls.forEach(poll => {
      items.push({ type: 'poll', poll, created_at: poll.created_at });
    });

    // Add shared polls
    (sharesData || []).forEach(share => {
      const originalPoll = pollsMap.get(share.poll_id);
      if (originalPoll) {
        items.push({
          type: 'shared_poll',
          poll: originalPoll,
          share: share as PollShare,
          created_at: share.created_at,
        });
      }
    });

    // Sort by created_at desc
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFeedItems(items);

    // Fetch all profiles
    const userIds = new Set<string>();
    transformedPolls.forEach(p => userIds.add(p.user_id));
    (sharesData || []).forEach(s => userIds.add(s.user_id));

    const userIdsArr = [...userIds];
    if (userIdsArr.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_verified')
        .in('user_id', userIdsArr);

      if (profilesData) {
        const profilesMap = new Map<string, { username: string; avatar_url: string | null; is_verified?: boolean; is_vip?: boolean }>();
        profilesData.forEach(p => {
          profilesMap.set(p.user_id, { 
            username: p.username, 
            avatar_url: p.avatar_url,
            is_verified: p.is_verified ?? false,
          });
        });
        setProfiles(profilesMap);
      }
    }

    setLoading(false);
  };

  const handlePollDelete = (pollId: string) => {
    setFeedItems(prev => prev.filter(item => item.poll.id !== pollId));
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">გამოკითხვები</h1>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            შექმნა
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>გამოკითხვები არ მოიძებნა</p>
            {isAdmin && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                შექმენი პირველი გამოკითხვა
              </Button>
            )}
          </div>
        ) : (
          feedItems.map((item, idx) => (
            <div key={`${item.type}-${item.share?.id || item.poll.id}-${idx}`} id={`poll-${item.poll.id}`}>
              {item.type === 'shared_poll' && item.share ? (
                <SharedPollCard
                  poll={item.poll}
                  share={item.share}
                  sharerProfile={profiles.get(item.share.user_id) || null}
                  pollAuthorProfile={profiles.get(item.poll.user_id) || null}
                  onUserClick={onUserClick}
                  onDelete={handlePollDelete}
                />
              ) : (
                <PollCardFB
                  poll={item.poll}
                  profile={profiles.get(item.poll.user_id) || null}
                  onUserClick={onUserClick}
                  onDelete={handlePollDelete}
                />
              )}
            </div>
          ))
        )}
        </div>
      </ScrollArea>

      <CreatePollModalFB
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchFeed}
      />
    </div>
  );
};

export default PollsView;
