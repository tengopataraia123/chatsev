import { memo } from 'react';
import { Share2, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
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
}

interface PollShare {
  id: string;
  poll_id: string;
  user_id: string;
  caption: string | null;
  created_at: string;
}

interface SharedPollCardProps {
  poll: Poll;
  share: PollShare;
  sharerProfile: { username: string; avatar_url: string | null; is_verified?: boolean } | null;
  pollAuthorProfile: { username: string; avatar_url: string | null; is_verified?: boolean } | null;
  onUserClick?: (userId: string) => void;
  onDelete?: (pollId: string) => void;
}

const SharedPollCard = memo(({ poll, share, sharerProfile, pollAuthorProfile, onUserClick, onDelete }: SharedPollCardProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const isShareOwner = user?.id === share.user_id;
  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(userRole || '');

  const handleDeleteShare = async () => {
    try {
      await supabase.from('poll_shares').delete().eq('id', share.id);
      toast({ title: 'გაზიარება წაიშალა' });
      onDelete?.(poll.id);
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Sharer header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => onUserClick?.(share.user_id)}>
            <Avatar className="w-8 h-8">
              <AvatarImage src={sharerProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {sharerProfile?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </button>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onUserClick?.(share.user_id)}
                className="font-medium text-sm hover:underline"
              >
                {sharerProfile?.username || 'უცნობი'}
              </button>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                გააზიარა გამოკითხვა
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(share.created_at), { locale: ka, addSuffix: true })}
            </span>
          </div>
        </div>

        {(isShareOwner || isAdmin) && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDeleteShare}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Caption */}
      {share.caption && (
        <p className="px-4 pb-2 text-sm">{share.caption}</p>
      )}

      {/* Embedded poll card (compact) */}
      <div className="mx-3 mb-3 border border-border rounded-xl overflow-hidden">
        <PollCardFB
          poll={poll}
          profile={pollAuthorProfile}
          onUserClick={onUserClick}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
});

SharedPollCard.displayName = 'SharedPollCard';

export default SharedPollCard;
