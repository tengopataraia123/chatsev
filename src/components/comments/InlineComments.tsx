import { useState, useEffect, useCallback, memo, forwardRef, useMemo } from 'react';
import { ChevronDown, ChevronUp, Loader2, Send, Reply, Trash2, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import StyledUsername from '@/components/username/StyledUsername';
import StyledText from '@/components/text/StyledText';
import { HashtagMentionText } from '@/components/hashtag';
import { UniversalReactionButton } from '@/components/reactions';
import GifPicker from '@/components/gif/GifPicker';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { findGifByShortcode, extractGifShortcode, recordGifUsage } from '@/lib/gifShortcodes';
import { useBatchUserStyles } from '@/hooks/useBatchUserStyles';

interface CommentReply {
  id: string;
  user_id: string;
  content: string;
  gif_id: string | null;
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
}

interface InlineComment {
  id: string;
  user_id: string;
  content: string;
  gif_id: string | null;
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
  replies?: CommentReply[];
}

interface InlineCommentsProps {
  postId: string;
  onUserClick?: (userId: string) => void;
  refreshTrigger?: number;
}

const InlineComments = memo(forwardRef<HTMLDivElement, InlineCommentsProps>(({ postId, onUserClick, refreshTrigger }, ref) => {
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<{ id: string; file_original: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Batch fetch user styles for all comment/reply authors (solves N+1 query problem)
  const allUserIds = useMemo(() => {
    const ids = new Set<string>();
    comments.forEach(c => {
      ids.add(c.user_id);
      c.replies?.forEach(r => ids.add(r.user_id));
    });
    return Array.from(ids).filter(Boolean);
  }, [comments]);
  
  const { stylesMap: userStylesMap } = useBatchUserStyles(allUserIds);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin' || data?.role === 'moderator' || data?.role === 'super_admin');
    };
    checkAdminStatus();
  }, [user?.id]);

  const fetchComments = useCallback(async () => {
    // Skip for group posts - they use a different ID format
    if (postId.startsWith('group-')) {
      setComments([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    
    try {
      // First get total count
      const { count } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      setTotalCount(count || 0);

      // Fetch only 1 comment for preview (newest), or more if expanded
      const limit = expanded ? 50 : 1;
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*, gif:gifs(id, file_original, title)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(limit);

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

      // Fetch replies if expanded
      let repliesMap = new Map<string, CommentReply[]>();
      if (expanded) {
        const commentIds = commentsData.map(c => c.id);
        const { data: repliesData } = await supabase
          .from('comment_replies')
          .select('*, gif:gifs(id, file_original, title)')
          .in('comment_id', commentIds)
          .order('created_at', { ascending: true });

        if (repliesData) {
          const replyUserIds = [...new Set(repliesData.map(r => r.user_id))];
          if (replyUserIds.length > 0) {
            const { data: replyProfilesData } = await supabase
              .from('profiles')
              .select('user_id, username, avatar_url')
              .in('user_id', replyUserIds);
            replyProfilesData?.forEach(p => profilesMap.set(p.user_id, p));
          }

          repliesData.forEach(reply => {
            const existing = repliesMap.get(reply.comment_id) || [];
            existing.push({
              ...reply,
              profile: profilesMap.get(reply.user_id)
            });
            repliesMap.set(reply.comment_id, existing);
          });
        }
      }

      // Transform comments
      const transformedComments = commentsData.map(comment => ({
        ...comment,
        profile: profilesMap.get(comment.user_id),
        replies: repliesMap.get(comment.id) || []
      }));

      setComments(transformedComments);
    } catch (error) {
      console.error('Error fetching inline comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId, expanded]);

  useEffect(() => {
    fetchComments();
    
    // Skip realtime for group posts
    if (postId.startsWith('group-')) return;
    
    // Subscribe to realtime comment updates
    const channel = supabase
      .channel(`inline-comments-${postId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComments, refreshTrigger, postId]);

  const handleSendReply = async (commentId: string) => {
    if ((!replyText.trim() && !selectedGif) || !user) return;

    setSending(true);
    try {
      let gifIdToSend = selectedGif?.id || null;
      let contentToSend = replyText.trim();

      if (!gifIdToSend && contentToSend) {
        const shortcode = extractGifShortcode(contentToSend);
        if (shortcode) {
          const foundGif = await findGifByShortcode(shortcode);
          if (foundGif) {
            gifIdToSend = foundGif.id;
            contentToSend = '';
            recordGifUsage(foundGif.id, user.id);
          }
        }
      }

      const { error } = await supabase.from('comment_replies').insert({
        comment_id: commentId,
        user_id: user.id,
        content: contentToSend || '',
        gif_id: gifIdToSend
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
      let query = supabase.from('post_comments').delete().eq('id', commentId);
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      await query;
      toast({ title: 'კომენტარი წაიშალა' });
      fetchComments();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDeleteReply = async (replyId: string, ownerId: string) => {
    if (!user) return;
    const canDelete = ownerId === user.id || isAdmin;
    if (!canDelete) return;

    try {
      let query = supabase.from('comment_replies').delete().eq('id', replyId);
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      await query;
      toast({ title: 'პასუხი წაიშალა' });
      fetchComments();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'ახლა';
    if (diffMins < 60) return `${diffMins} წთ`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} სთ`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} დღე`;
  };

  if (loading) {
    return (
      <div className="py-2 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (comments.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="border-t border-border mt-2 pt-2 space-y-2">
      {/* Comments list - scrollable when expanded */}
      <div className={`space-y-3 ${expanded ? 'max-h-[400px] overflow-y-auto scrollbar-thin pr-1' : ''}`}>
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            {/* Main Comment */}
            <div className="flex gap-2 items-start">
              <button 
                onClick={() => onUserClick?.(comment.user_id)}
                className="flex-shrink-0"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.profile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-xs">
                    {comment.profile?.username?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="flex-1 min-w-0">
                <div className="bg-secondary rounded-2xl px-3 py-2">
                  <StyledUsername
                    userId={comment.user_id}
                    username={comment.profile?.username || 'უცნობი'}
                    className="font-semibold text-xs hover:underline"
                    onClick={() => onUserClick?.(comment.user_id)}
                    prefetchedData={userStylesMap.get(comment.user_id) || undefined}
                  />
                  {comment.gif && (
                    <img 
                      src={comment.gif.file_original} 
                      alt={comment.gif.title || 'GIF'}
                      className="max-w-[100px] max-h-[100px] rounded-xl my-1 object-contain"
                      loading="lazy"
                    />
                  )}
                  {comment.content && (
                    <HashtagMentionText 
                      content={comment.content} 
                      className="text-sm break-words"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 px-2">
                  <span className="text-[10px] text-muted-foreground">
                    {getTimeAgo(comment.created_at)}
                  </span>
                  <UniversalReactionButton
                    targetType="comment"
                    targetId={comment.id}
                    contentOwnerId={comment.user_id}
                    size="sm"
                    showLabel={false}
                  />
                  <button 
                    onClick={() => {
                      setReplyingTo(comment.id);
                      if (!expanded) setExpanded(true);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>
                  {(user?.id === comment.user_id || isAdmin) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-card border-border">
                        <DropdownMenuItem onClick={() => handleDeleteComment(comment.id, comment.user_id)}>
                          <Trash2 className="w-3 h-3 mr-2" />
                          წაშლა
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Reply Input */}
                {replyingTo === comment.id && expanded && (
                  <div className="mt-2 space-y-2">
                    {selectedGif && (
                      <div className="relative inline-block">
                        <img src={selectedGif.file_original} alt="GIF" className="max-h-16 rounded" loading="lazy" />
                        <button 
                          onClick={() => setSelectedGif(null)}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 items-center">
                      <Input
                        placeholder={`პასუხი @${comment.profile?.username}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyPress={(e) => {
                          const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                          if (e.key === 'Enter' && !isMobile) handleSendReply(comment.id);
                        }}
                        className="flex-1 text-xs h-8"
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setShowGifPicker(comment.id)}
                        className="font-bold text-primary px-2 text-xs h-8"
                      >
                        GIF
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleSendReply(comment.id)}
                        disabled={(!replyText.trim() && !selectedGif) || sending}
                        className="h-8 px-2"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => { setReplyingTo(null); setReplyText(''); setSelectedGif(null); }}
                        className="h-8 px-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Replies - only show when expanded */}
            {expanded && comment.replies && comment.replies.length > 0 && (
              <div className="ml-10 space-y-2">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2 items-start">
                    <button onClick={() => onUserClick?.(reply.user_id)} className="flex-shrink-0">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={reply.profile?.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className="text-[10px]">
                          {reply.profile?.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="bg-secondary/70 rounded-xl px-2.5 py-1.5">
                        <StyledUsername
                          userId={reply.user_id}
                          username={reply.profile?.username || 'უცნობი'}
                          className="font-semibold text-[11px] hover:underline"
                          onClick={() => onUserClick?.(reply.user_id)}
                          prefetchedData={userStylesMap.get(reply.user_id) || undefined}
                        />
                        {reply.gif && (
                          <img 
                            src={reply.gif.file_original} 
                            alt={reply.gif.title || 'GIF'}
                            className="max-w-[100px] max-h-[100px] rounded-xl my-1 object-contain"
                            loading="lazy"
                          />
                        )}
                        {reply.content && (
                          <HashtagMentionText 
                            content={reply.content} 
                            className="text-xs break-words"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 px-2">
                        <span className="text-[10px] text-muted-foreground">
                          {getTimeAgo(reply.created_at)}
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
                            onClick={() => handleDeleteReply(reply.id, reply.user_id)}
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

      {/* Toggle button */}
      {totalCount > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              დამალვა
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              ყველას ნახვა ({totalCount})
            </>
          )}
        </button>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <GifPicker 
          onSelect={(gif) => {
            setSelectedGif(gif);
            setShowGifPicker(null);
          }}
          onClose={() => setShowGifPicker(null)}
        />
      )}
    </div>
  );
}));

InlineComments.displayName = 'InlineComments';

export default InlineComments;
