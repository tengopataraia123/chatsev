import { useState, useEffect, useCallback, memo } from 'react';
import { ChevronDown, ChevronUp, Loader2, Send, Reply, Trash2, MoreVertical, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import StyledUsername from '@/components/username/StyledUsername';
import StyledText from '@/components/text/StyledText';
import { UniversalReactionButton } from '@/components/reactions';
import GifPicker from '@/components/gif/GifPicker';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface PollComment {
  id: string;
  user_id: string;
  content: string;
  gif_id: string | null;
  parent_id: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  gif?: {
    id: string;
    file_original: string;
    title: string;
  } | null;
  replies?: PollComment[];
}

interface PollCommentsSectionProps {
  pollId: string;
  isOpen: boolean;
  onUserClick?: (userId: string) => void;
}

const PollCommentsSection = memo(({ pollId, isOpen, onUserClick }: PollCommentsSectionProps) => {
  const [comments, setComments] = useState<PollComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGif, setSelectedGif] = useState<{ id: string; file_original: string } | null>(null);
  
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(userRole || '');

  const fetchComments = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      const { data: commentsData, error } = await supabase
        .from('poll_comments')
        .select('*')
        .eq('poll_id', pollId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Get user IDs and fetch profiles
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map<string, any>();
      profilesData?.forEach(p => profilesMap.set(p.user_id, p));

      // Fetch replies
      const commentIds = commentsData.map(c => c.id);
      const { data: repliesData } = await supabase
        .from('poll_comments')
        .select('*')
        .in('parent_id', commentIds)
        .order('created_at', { ascending: true });

      if (repliesData && repliesData.length > 0) {
        const replyUserIds = [...new Set(repliesData.map(r => r.user_id))];
        const { data: replyProfilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', replyUserIds);
        replyProfilesData?.forEach(p => profilesMap.set(p.user_id, p));
      }

      const repliesMap = new Map<string, PollComment[]>();
      repliesData?.forEach(reply => {
        const existing = repliesMap.get(reply.parent_id!) || [];
        existing.push({
          ...reply,
          gif_id: null,
          gif: null,
          profile: profilesMap.get(reply.user_id)
        });
        repliesMap.set(reply.parent_id!, existing);
      });

      const transformedComments: PollComment[] = commentsData.map(comment => ({
        ...comment,
        gif_id: null,
        gif: null,
        profile: profilesMap.get(comment.user_id),
        replies: repliesMap.get(comment.id) || []
      }));

      setComments(transformedComments);
    } catch (error) {
      console.error('Error fetching poll comments:', error);
    } finally {
      setLoading(false);
    }
  }, [pollId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [fetchComments, isOpen]);

  const handleSendComment = async () => {
    if ((!newComment.trim() && !selectedGif) || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('poll_comments').insert({
        poll_id: pollId,
        user_id: user.id,
        content: newComment.trim(),
        gif_id: selectedGif?.id || null
      });

      if (error) throw error;

      setNewComment('');
      setSelectedGif(null);
      fetchComments();
    } catch (error) {
      console.error('Error sending comment:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (parentId: string) => {
    if ((!replyText.trim() && !selectedGif) || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('poll_comments').insert({
        poll_id: pollId,
        user_id: user.id,
        content: replyText.trim(),
        gif_id: selectedGif?.id || null,
        parent_id: parentId
      });

      if (error) throw error;

      setReplyText('');
      setSelectedGif(null);
      setReplyingTo(null);
      fetchComments();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string, ownerId: string) => {
    if (!user) return;
    const canDelete = ownerId === user.id || isAdmin;
    if (!canDelete) return;

    try {
      await supabase.from('poll_comments').delete().eq('id', commentId);
      toast({ title: 'კომენტარი წაიშალა' });
      fetchComments();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      {/* Comment Input */}
      {user && (
        <div className="p-3 border-b border-border">
          {selectedGif && (
            <div className="relative inline-block mb-2">
              <img src={selectedGif.file_original} alt="GIF" className="max-h-20 rounded" loading="lazy" />
              <button 
                onClick={() => setSelectedGif(null)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Input
              placeholder="დაწერე კომენტარი..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => {
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                if (e.key === 'Enter' && !isMobile) handleSendComment();
              }}
              className="flex-1 bg-secondary/50 border-none"
            />
            <button
              onClick={() => setShowGifPicker(true)}
              className="px-2 py-1 text-xs font-bold text-muted-foreground hover:text-foreground border border-muted-foreground/30 rounded hover:border-foreground/50 transition-colors"
            >
              GIF
            </button>
            <Button 
              size="sm" 
              onClick={handleSendComment}
              disabled={(!newComment.trim() && !selectedGif) || sending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <GifPicker
          onSelect={(gif) => {
            setSelectedGif({ id: gif.id, file_original: gif.file_original });
            setShowGifPicker(false);
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Comments List */}
      <div className="max-h-[400px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            კომენტარები არ არის
          </p>
        ) : (
          <div className="p-3 space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Main Comment */}
                <div className="flex gap-2">
                  <button onClick={() => onUserClick?.(comment.user_id)} className="flex-shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {comment.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="bg-secondary rounded-2xl px-3 py-2">
                      <StyledUsername
                        userId={comment.user_id}
                        username={comment.profile?.username || 'Unknown'}
                        className="font-semibold text-xs hover:underline"
                        onClick={() => onUserClick?.(comment.user_id)}
                      />
                      {comment.gif && (
                        <img 
                          src={comment.gif.file_original} 
                          alt={comment.gif.title || 'GIF'}
                          className="max-w-[120px] max-h-[120px] rounded-xl my-1 object-contain"
                          loading="lazy"
                        />
                      )}
                      {comment.content && (
                        <StyledText userId={comment.user_id} className="text-sm break-words">
                          {comment.content}
                        </StyledText>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { locale: ka, addSuffix: true })}
                      </span>
                      <UniversalReactionButton
                        targetType="comment"
                        targetId={comment.id}
                        contentOwnerId={comment.user_id}
                        size="sm"
                        showLabel={false}
                      />
                      <button 
                        onClick={() => setReplyingTo(comment.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      >
                        <Reply className="w-3 h-3" />
                        პასუხი
                      </button>
                      {(user?.id === comment.user_id || isAdmin) && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                          className="text-[10px] text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <div className="mt-2 flex gap-2 items-center">
                        <Input
                          placeholder={`პასუხი @${comment.profile?.username}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyPress={(e) => {
                            const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                            if (e.key === 'Enter' && !isMobile) handleSendReply(comment.id);
                          }}
                          className="flex-1 text-xs h-8 bg-secondary/50 border-none"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleSendReply(comment.id)}
                          disabled={!replyText.trim() || sending}
                          className="h-8 px-2"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          className="h-8 px-2"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <button onClick={() => onUserClick?.(reply.user_id)} className="flex-shrink-0">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={reply.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {reply.profile?.username?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="bg-secondary/70 rounded-xl px-2.5 py-1.5">
                            <StyledUsername
                              userId={reply.user_id}
                              username={reply.profile?.username || 'Unknown'}
                              className="font-semibold text-[11px] hover:underline"
                              onClick={() => onUserClick?.(reply.user_id)}
                            />
                            {reply.gif && (
                              <img 
                                src={reply.gif.file_original} 
                                alt={reply.gif.title || 'GIF'}
                                className="max-w-[100px] max-h-[100px] rounded-xl my-1 object-contain"
                                loading="lazy"
                              />
                            )}
                            {reply.content && <p className="text-xs break-words">{reply.content}</p>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 px-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.created_at), { locale: ka, addSuffix: true })}
                            </span>
                            <UniversalReactionButton
                              targetType="reply"
                              targetId={reply.id}
                              contentOwnerId={reply.user_id}
                              size="sm"
                              showLabel={false}
                            />
                            {(user?.id === reply.user_id || isAdmin) && (
                              <button 
                                onClick={() => handleDeleteComment(reply.id, reply.user_id)}
                                className="text-[10px] text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

PollCommentsSection.displayName = 'PollCommentsSection';

export default PollCommentsSection;
