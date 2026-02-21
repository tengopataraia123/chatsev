import { useState, useEffect, memo } from 'react';
import { Check, Clock, MoreHorizontal, Users, Lock, Trash2, XCircle, Share2, RefreshCw, BarChart3, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ka } from 'date-fns/locale';
import PollVotersModal from './PollVotersModal';
import PollCommentsSection from './PollCommentsSection';
import PollShareDialog from './PollShareDialog';
import FacebookFeedActions from '@/components/feed/FacebookFeedActions';
import FacebookReactionsBar from '@/components/feed/FacebookReactionsBar';
import VerifiedBadge from '@/components/verified/VerifiedBadge';
import VipBadge from '@/components/vip/VipBadge';

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
  context_type?: string;
  is_pinned?: boolean;
}

interface PollCardFBProps {
  poll: Poll;
  profile?: {
    username: string;
    avatar_url: string | null;
    is_verified?: boolean;
    is_vip?: boolean;
  } | null;
  onUserClick?: (userId: string) => void;
  onDelete?: (pollId: string) => void;
  isSuperAdmin?: boolean;
  onPinToggle?: () => void;
}

interface VoteData {
  option_index: number;
  count: number;
}

const PollCardFB = memo(({ poll, profile, onUserClick, onDelete, isSuperAdmin, onPinToggle }: PollCardFBProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [userVotes, setUserVotes] = useState<number[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [pendingVotes, setPendingVotes] = useState<number[]>([]);

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const isPollEnded = isExpired || poll.is_closed;
  const canVote = !isPollEnded && user && (poll.allow_change_vote || userVotes.length === 0);
  const isOwner = user?.id === poll.user_id;
  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(userRole || '');

  // Determine if results should be shown
  const shouldShowResults = () => {
    if (poll.show_results_mode === 'immediately') return true;
    if (poll.show_results_mode === 'after_vote' && hasVoted) return true;
    if (poll.show_results_mode === 'after_end' && isPollEnded) return true;
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
      const voteCounts: VoteData[] = poll.options.map((_, index) => ({
        option_index: index,
        count: allVotes.filter(v => v.option_index === index).length
      }));
      setVotes(voteCounts);
      setTotalVotes(allVotes.length);

      if (user) {
        const currentUserVotes = allVotes
          .filter(v => v.user_id === user.id)
          .map(v => v.option_index);
        setUserVotes(currentUserVotes);
        setHasVoted(currentUserVotes.length > 0);
        setPendingVotes(currentUserVotes);
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

  const handleOptionClick = (optionIndex: number) => {
    if (!user || isPollEnded) return;
    if (hasVoted && !poll.allow_change_vote) return;

    if (poll.allow_multiple_choice) {
      const maxSelections = poll.max_selections || 3;
      if (pendingVotes.includes(optionIndex)) {
        setPendingVotes(pendingVotes.filter(v => v !== optionIndex));
      } else if (pendingVotes.length < maxSelections) {
        setPendingVotes([...pendingVotes, optionIndex]);
      } else {
        toast({ title: `მაქსიმუმ ${maxSelections} ვარიანტი შეგიძლიათ აირჩიოთ`, variant: 'destructive' });
      }
    } else {
      setPendingVotes([optionIndex]);
    }
  };

  const handleSubmitVote = async () => {
    if (!user || pendingVotes.length === 0) return;

    setLoading(true);
    try {
      // Remove existing votes if changing
      if (hasVoted && poll.allow_change_vote) {
        await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('user_id', user.id);
      }

      // Insert new votes
      const votesToInsert = pendingVotes.map(optionIndex => ({
        poll_id: poll.id,
        user_id: user.id,
        option_index: optionIndex
      }));

      await supabase.from('poll_votes').insert(votesToInsert);

      // Send notification to poll owner
      if (poll.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: poll.user_id,
          from_user_id: user.id,
          type: 'poll_vote',
          message: 'მისცა ხმა თქვენს გამოკითხვას'
        });
      }

      await fetchVotes();
      toast({ title: 'ხმა მიღებულია!' });
    } catch (error: any) {
      console.error('Vote error:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const handleDelete = async () => {
    try {
      await supabase.from('polls').delete().eq('id', poll.id);
      toast({ title: 'გამოკითხვა წაიშალა' });
      onDelete?.(poll.id);
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleClosePoll = async () => {
    try {
      await supabase
        .from('polls')
        .update({ is_closed: true, closed_at: new Date().toISOString() })
        .eq('id', poll.id);
      toast({ title: 'გამოკითხვა დაიხურა' });
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handlePinToggle = async () => {
    if (!isSuperAdmin) return;
    try {
      const isPinned = !!poll.is_pinned;
      if (isPinned) {
        // Unpin
        await supabase
          .from('polls')
          .update({ is_pinned: false, globally_pinned_at: null, globally_pinned_by: null } as any)
          .eq('id', poll.id);
        toast({ title: 'გამოკითხვა მოიხსნა მიმაგრებიდან' });
      } else {
        // Unpin any existing pinned poll first
        await supabase
          .from('polls')
          .update({ is_pinned: false, globally_pinned_at: null, globally_pinned_by: null } as any)
          .eq('is_pinned', true);
        // Pin this one
        await supabase
          .from('polls')
          .update({ is_pinned: true, globally_pinned_at: new Date().toISOString(), globally_pinned_by: user?.id } as any)
          .eq('id', poll.id);
        toast({ title: 'გამოკითხვა მიმაგრებულია ფიდის სათავეში' });
      }
      onPinToggle?.();
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getTimeLeft = () => {
    if (!poll.expires_at) return null;
    if (isExpired) return 'დასრულდა';
    
    const expiresAt = new Date(poll.expires_at);
    const now = new Date();
    
    const days = differenceInDays(expiresAt, now);
    if (days > 0) return `${days} დღე დარჩა`;
    
    const hours = differenceInHours(expiresAt, now);
    if (hours > 0) return `${hours} საათი დარჩა`;
    
    const minutes = differenceInMinutes(expiresAt, now);
    return `${minutes} წუთი დარჩა`;
  };

  const showResults = shouldShowResults();
  const canSubmit = pendingVotes.length > 0 && (!hasVoted || poll.allow_change_vote);

  return (
    <div
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
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-sm">{profile?.username || 'უცნობი'}</p>
              {profile?.is_verified && <VerifiedBadge size="sm" />}
              {profile?.is_vip && <VipBadge size="sm" vipType="gold" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-nowrap">
              <span className="shrink-0">{formatDistanceToNow(new Date(poll.created_at), { locale: ka }).replace(/^დაახლოებით\s*/i, '')}</span>
              {poll.is_pinned && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 border-primary/50 text-primary shrink-0 whitespace-nowrap">
                  <Pin className="w-3 h-3" />
                  მიმაგრებული
                </Badge>
              )}
              {poll.visibility !== 'everyone' && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 shrink-0">
                  {poll.visibility === 'friends' ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1 shrink-0 whitespace-nowrap">
                <BarChart3 className="w-3 h-3" />
                გამოკითხვა
              </Badge>
            </div>
          </div>
        </div>

        {(isOwner || isAdmin || isSuperAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isSuperAdmin && (
                <DropdownMenuItem onClick={handlePinToggle} className={poll.is_pinned ? 'text-orange-500' : 'text-primary'}>
                  {poll.is_pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                  {poll.is_pinned ? 'მიმაგრების მოხსნა' : 'მიმაგრება ფიდში'}
                </DropdownMenuItem>
              )}
              {isOwner && !isPollEnded && (
                <DropdownMenuItem onClick={handleClosePoll}>
                  <XCircle className="w-4 h-4 mr-2" />
                  დახურვა
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
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
        <p className="text-base font-medium mb-3">{poll.question}</p>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {poll.is_anonymous && (
            <Badge variant="secondary" className="text-xs">ანონიმური</Badge>
          )}
          {poll.allow_multiple_choice && (
            <Badge variant="secondary" className="text-xs">
              მრავალი არჩევანი ({poll.max_selections || 3} მაქს.)
            </Badge>
          )}
          {poll.allow_change_vote && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              შეცვლა შეიძლება
            </Badge>
          )}
          {isPollEnded && (
            <Badge variant="destructive" className="text-xs">დასრულებული</Badge>
          )}
          {getTimeLeft() && !isPollEnded && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeLeft()}
            </Badge>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
            {poll.options.map((option, index) => {
              const voteData = votes.find(v => v.option_index === index);
              const voteCount = voteData?.count || 0;
              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isSelected = pendingVotes.includes(index);
              const wasVoted = userVotes.includes(index);

              return (
                <div
                  key={index}
                  className={`relative rounded-xl border-2 p-3 transition-all ${
                    !isPollEnded && (!hasVoted || poll.allow_change_vote)
                      ? 'cursor-pointer hover:border-primary hover:bg-primary/5' 
                      : ''
                  } ${isSelected ? 'border-primary bg-primary/10' : 'border-border'}`}
                  onClick={() => handleOptionClick(index)}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    {/* Checkbox/Radio indicator */}
                    <div className={`w-5 h-5 shrink-0 rounded-${poll.allow_multiple_choice ? 'md' : 'full'} border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className={`flex-1 min-w-0 break-words text-sm ${isSelected || wasVoted ? 'font-medium' : ''}`}>{option}</span>
                    {wasVoted && hasVoted && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 shrink-0">
                        თქვენი
                      </Badge>
                    )}
                    {showResults && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0 whitespace-nowrap">
                        <span>{voteCount}</span>
                        <span>{percentage}%</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  {showResults && (
                    <motion.div
                      className="absolute inset-0 overflow-hidden rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className={`h-full ${isSelected || wasVoted ? 'bg-primary/20' : 'bg-secondary/80'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </motion.div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Vote Button */}
        {!isPollEnded && canSubmit && (
          <Button 
            onClick={handleSubmitVote}
            disabled={loading}
            className="w-full mt-3"
          >
            {loading ? 'იტვირთება...' : hasVoted ? 'ხმის შეცვლა' : 'ხმის მიცემა'}
          </Button>
        )}

        {/* View Results button (before voting, if allowed) */}
        {!hasVoted && !showResults && poll.show_results_mode !== 'after_end' && (
          <Button 
            variant="ghost" 
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={() => setShowVotersModal(true)}
          >
            შედეგების ნახვა
          </Button>
        )}

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

      {/* Share Dialog */}
      <PollShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        pollId={poll.id}
        pollQuestion={poll.question}
        pollOwnerId={poll.user_id}
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

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && poll.allow_comments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <PollCommentsSection
              pollId={poll.id}
              isOpen={showComments}
              onUserClick={onUserClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

PollCardFB.displayName = 'PollCardFB';

export default PollCardFB;
