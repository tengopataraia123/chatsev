import { useState, useEffect } from 'react';
import { Check, Clock, MoreHorizontal, Users, Lock, ChevronDown, ChevronUp, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import PollVotersModal from './PollVotersModal';
import FacebookFeedActions from '@/components/feed/FacebookFeedActions';
import FacebookReactionsBar from '@/components/feed/FacebookReactionsBar';

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
  expires_at: string | null;
  show_results_mode: string;
  allow_comments: boolean;
  visibility: string;
  status: string;
  is_closed: boolean;
  created_at: string;
}

interface PollCardProps {
  poll: Poll;
  profile?: {
    username: string;
    avatar_url: string | null;
  } | null;
  onUserClick?: (userId: string) => void;
  onDelete?: (pollId: string) => void;
  isAdminView?: boolean;
}

interface VoteData {
  option_index: number;
  count: number;
}

const PollCard = ({ poll, profile, onUserClick, onDelete, isAdminView }: PollCardProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [userVotes, setUserVotes] = useState<number[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showVotersModal, setShowVotersModal] = useState(false);

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const canVote = !isExpired && !poll.is_closed && user && (poll.allow_change_vote || userVotes.length === 0);
  const isOwner = user?.id === poll.user_id;
  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(userRole || '');

  // Determine if results should be shown
  const shouldShowResults = () => {
    if (poll.show_results_mode === 'immediately') return true;
    if (poll.show_results_mode === 'after_vote' && userVotes.length > 0) return true;
    if (poll.show_results_mode === 'after_end' && (isExpired || poll.is_closed)) return true;
    if (isOwner || isAdmin) return true;
    return false;
  };

  useEffect(() => {
    fetchVotes();
    if (poll.allow_comments) {
      fetchCommentsCount();
    }
  }, [poll.id]);

  const fetchVotes = async () => {
    const { data: allVotes } = await supabase
      .from('poll_votes')
      .select('option_index, user_id')
      .eq('poll_id', poll.id);

    if (allVotes) {
      // Count votes per option
      const voteCounts: VoteData[] = poll.options.map((_, index) => ({
        option_index: index,
        count: allVotes.filter(v => v.option_index === index).length
      }));
      setVotes(voteCounts);
      setTotalVotes(allVotes.length);

      // Get current user's votes
      if (user) {
        const currentUserVotes = allVotes
          .filter(v => v.user_id === user.id)
          .map(v => v.option_index);
        setUserVotes(currentUserVotes);
      }
    }
  };

  const fetchCommentsCount = async () => {
    const { count } = await supabase
      .from('poll_comments')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', poll.id);
    
    setCommentsCount(count || 0);
  };

  const handleVote = async (optionIndex: number) => {
    if (!user) {
      toast({ title: 'გთხოვთ შედით სისტემაში', variant: 'destructive' });
      return;
    }

    if (!canVote && !poll.allow_change_vote) {
      toast({ title: 'უკვე მიცემული გაქვთ ხმა', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      if (poll.allow_multiple_choice) {
        // Toggle vote for this option
        if (userVotes.includes(optionIndex)) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', poll.id)
            .eq('user_id', user.id)
            .eq('option_index', optionIndex);
        } else {
          await supabase
            .from('poll_votes')
            .insert({ poll_id: poll.id, user_id: user.id, option_index: optionIndex });
        }
      } else {
        // Single choice - remove existing vote first
        if (userVotes.length > 0 && poll.allow_change_vote) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', poll.id)
            .eq('user_id', user.id);
        }
        
        if (!userVotes.includes(optionIndex)) {
          await supabase
            .from('poll_votes')
            .insert({ poll_id: poll.id, user_id: user.id, option_index: optionIndex });
        }
      }

      await fetchVotes();
      toast({ title: 'ხმა მიღებულია!' });
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'უკვე მიცემული გაქვთ ხმა', variant: 'destructive' });
      } else {
        toast({ title: 'შეცდომა', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/poll/${poll.id}`);
    toast({ title: 'ბმული დაკოპირდა' });
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('polls').delete().eq('id', poll.id);
      
      if (error) {
        console.error('Error deleting poll:', error);
        toast({ title: 'შეცდომა წაშლისას', description: error.message, variant: 'destructive' });
        return;
      }
      
      toast({ title: 'გამოკითხვა წაიშალა' });
      onDelete?.(poll.id);
    } catch (err) {
      console.error('Error deleting poll:', err);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleClosePoll = async () => {
    try {
      await supabase
        .from('polls')
        .update({ is_closed: true })
        .eq('id', poll.id);
      toast({ title: 'გამოკითხვა დაიხურა' });
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getTimeLeft = () => {
    if (!poll.expires_at) return null;
    if (isExpired) return 'დასრულდა';
    
    return formatDistanceToNow(new Date(poll.expires_at), { locale: ka, addSuffix: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onUserClick?.(poll.user_id)}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {profile?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{profile?.username || 'უცნობი'}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(poll.created_at), { locale: ka, addSuffix: true })}</span>
              {poll.visibility !== 'everyone' && (
                <Badge variant="outline" className="text-[10px] py-0 px-1">
                  {poll.visibility === 'friends' ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {(isOwner || isAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && !poll.is_closed && !isExpired && (
                <DropdownMenuItem onClick={handleClosePoll}>
                  <XCircle className="w-4 h-4 mr-2" />
                  დახურვა
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                წაშლა
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Poll Content */}
      <div className="px-4 pb-3">
        {poll.title && (
          <h3 className="font-semibold text-lg mb-1">{poll.title}</h3>
        )}
        <p className="text-base mb-3">{poll.question}</p>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {poll.is_anonymous && (
            <Badge variant="secondary" className="text-xs">ანონიმური</Badge>
          )}
          {poll.allow_multiple_choice && (
            <Badge variant="secondary" className="text-xs">მრავალი არჩევანი</Badge>
          )}
          {(isExpired || poll.is_closed) && (
            <Badge variant="destructive" className="text-xs">დასრულებული</Badge>
          )}
          {getTimeLeft() && !isExpired && !poll.is_closed && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeLeft()}
            </Badge>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
          <AnimatePresence>
            {poll.options.map((option, index) => {
              const voteData = votes.find(v => v.option_index === index);
              const voteCount = voteData?.count || 0;
              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isSelected = userVotes.includes(index);
              const showResults = shouldShowResults();

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative rounded-lg border p-3 transition-all ${
                    canVote 
                      ? 'cursor-pointer hover:border-primary hover:bg-primary/5' 
                      : ''
                  } ${isSelected ? 'border-primary bg-primary/10' : 'border-border'}`}
                  onClick={() => canVote && handleVote(index)}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      <span className={isSelected ? 'font-medium' : ''}>{option}</span>
                    </div>
                    {showResults && (
                      <span className="text-sm font-medium text-muted-foreground ml-2">
                        {percentage}%
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  {showResults && (
                    <motion.div
                      className="absolute inset-0 overflow-hidden rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className={`h-full ${isSelected ? 'bg-primary/20' : 'bg-secondary'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Total votes - clickable to show voters */}
        <button 
          className="text-sm text-muted-foreground mt-3 hover:text-primary hover:underline transition-colors cursor-pointer flex items-center gap-1"
          onClick={() => setShowVotersModal(true)}
        >
          <Users className="w-4 h-4" />
          {totalVotes} ხმა
        </button>
      </div>

      {/* Voters Modal */}
      <PollVotersModal
        isOpen={showVotersModal}
        onClose={() => setShowVotersModal(false)}
        pollId={poll.id}
        options={poll.options}
        isAnonymous={poll.is_anonymous}
        onUserClick={onUserClick}
      />

      {/* Facebook Reactions Bar */}
      <FacebookReactionsBar
        itemId={poll.id}
        itemType="poll"
        commentsCount={commentsCount}
        onCommentsClick={() => poll.allow_comments && setShowComments(!showComments)}
      />

      {/* Facebook-style Footer */}
      <FacebookFeedActions
        itemId={poll.id}
        itemType="poll"
        ownerId={poll.user_id}
        onCommentClick={() => poll.allow_comments && setShowComments(!showComments)}
        onShareClick={handleShare}
        commentsCount={commentsCount}
      />

      {/* Comments Section - placeholder */}
      <AnimatePresence>
        {showComments && poll.allow_comments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 text-center text-sm text-muted-foreground">
              კომენტარები მალე დაემატება
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PollCard;
