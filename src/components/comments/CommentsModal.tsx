import { useState, useEffect, useCallback } from 'react';
import { X, Send, Reply, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import GifPicker from '@/components/gif/GifPicker';
import { UniversalReactionButton } from '@/components/reactions';
import StyledUsername from '@/components/username/StyledUsername';
import StyledText from '@/components/text/StyledText';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { findGifByShortcode, extractGifShortcode, recordGifUsage } from '@/lib/gifShortcodes';

interface Comment {
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
    file_preview: string | null;
    title: string;
  } | null;
  replies?: CommentReply[];
  likes_count?: number;
  is_liked?: boolean;
}

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
    file_preview: string | null;
    title: string;
  } | null;
  likes_count?: number;
  is_liked?: boolean;
}

interface ReactionCount {
  reaction_type: string;
  count: number;
}

interface CommentsModalProps {
  postId: string;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
}

const CommentsModal = ({ postId, onClose, onUserClick }: CommentsModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showReplyGifPicker, setShowReplyGifPicker] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<{ id: string; file_original: string } | null>(null);
  const [selectedReplyGif, setSelectedReplyGif] = useState<{ id: string; file_original: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'comment' | 'reply'; ownerId: string } | null>(null);
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [sharesCount, setSharesCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

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

  // Fetch reactions and shares count
  useEffect(() => {
    const fetchReactionsAndShares = async () => {
      // Skip for group posts - they use a different ID format
      if (postId.startsWith('group-')) {
        setReactions([]);
        setSharesCount(0);
        return;
      }
      
      // Fetch reactions
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('reaction_type')
        .eq('message_id', postId)
        .eq('message_type', 'post');

      if (reactionsData) {
        const counts = new Map<string, number>();
        reactionsData.forEach(r => {
          counts.set(r.reaction_type, (counts.get(r.reaction_type) || 0) + 1);
        });

        const reactionCounts: ReactionCount[] = [];
        counts.forEach((count, type) => {
          reactionCounts.push({ reaction_type: type, count });
        });
        setReactions(reactionCounts.sort((a, b) => b.count - a.count));
      }

      // Fetch shares count
      const { count } = await supabase
        .from('post_shares')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      setSharesCount(count || 0);
    };

    fetchReactionsAndShares();
  }, [postId]);

  const fetchComments = useCallback(async () => {
    // Skip for group posts - they use a different ID format
    if (postId.startsWith('group-')) {
      setComments([]);
      setLoading(false);
      return;
    }
    
    try {
      // Fetch comments with GIF data
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Get user IDs
      const userIds = [...new Set(commentsData.map(c => c.user_id))];

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map<string, any>();
      profilesData?.forEach(p => profilesMap.set(p.user_id, p));

      // Fetch comment likes count
      const commentIds = commentsData.map(c => c.id);
      const { data: commentLikesData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);

      // Fetch user's likes on comments
      let userCommentLikes: string[] = [];
      if (user) {
        const { data: userLikesData } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        userCommentLikes = userLikesData?.map(l => l.comment_id) || [];
      }

      // Count likes per comment
      const commentLikesCount = new Map<string, number>();
      commentLikesData?.forEach(like => {
        const count = commentLikesCount.get(like.comment_id) || 0;
        commentLikesCount.set(like.comment_id, count + 1);
      });

      // Fetch replies with GIF data
      const { data: repliesData } = await supabase
        .from('comment_replies')
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .in('comment_id', commentIds)
        .order('created_at', { ascending: true });

      // Fetch reply likes
      const replyIds = repliesData?.map(r => r.id) || [];
      let replyLikesCount = new Map<string, number>();
      let userReplyLikes: string[] = [];
      
      if (replyIds.length > 0) {
        const { data: replyLikesData } = await supabase
          .from('reply_likes')
          .select('reply_id')
          .in('reply_id', replyIds);
        
        replyLikesData?.forEach(like => {
          const count = replyLikesCount.get(like.reply_id) || 0;
          replyLikesCount.set(like.reply_id, count + 1);
        });

        if (user) {
          const { data: userReplyLikesData } = await supabase
            .from('reply_likes')
            .select('reply_id')
            .eq('user_id', user.id)
            .in('reply_id', replyIds);
          userReplyLikes = userReplyLikesData?.map(l => l.reply_id) || [];
        }
      }

      // Get reply user IDs and fetch their profiles
      const replyUserIds = [...new Set(repliesData?.map(r => r.user_id) || [])];
      if (replyUserIds.length > 0) {
        const { data: replyProfilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', replyUserIds);
        replyProfilesData?.forEach(p => profilesMap.set(p.user_id, p));
      }

      // Map replies to comments
      const repliesMap = new Map<string, CommentReply[]>();
      repliesData?.forEach(reply => {
        const existing = repliesMap.get(reply.comment_id) || [];
        existing.push({
          ...reply,
          profile: profilesMap.get(reply.user_id),
          likes_count: replyLikesCount.get(reply.id) || 0,
          is_liked: userReplyLikes.includes(reply.id)
        });
        repliesMap.set(reply.comment_id, existing);
      });

      // Transform comments with profiles and replies
      const transformedComments = commentsData.map(comment => ({
        ...comment,
        profile: profilesMap.get(comment.user_id),
        replies: repliesMap.get(comment.id) || [],
        likes_count: commentLikesCount.get(comment.id) || 0,
        is_liked: userCommentLikes.includes(comment.id)
      }));

      setComments(transformedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    fetchComments();
    
    // Skip realtime for group posts
    if (postId.startsWith('group-')) return;
    
    // Subscribe to realtime comment updates
    const channel = supabase
      .channel(`comments-modal-${postId}-${Date.now()}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_replies'
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComments, postId]);

  const handleSendComment = async () => {
    // Prevent double sending
    if (sending) return;
    if ((!commentText.trim() && !selectedGif) || !user) return;
    
    // Skip for group posts
    if (postId.startsWith('group-')) {
      console.log('[CommentsModal] Skipping comment for group post');
      return;
    }

    setSending(true);
    try {
      let gifIdToSend = selectedGif?.id || null;
      let contentToSend = commentText.trim();

      // Clear input immediately to prevent double send
      setCommentText('');
      setSelectedGif(null);

      // Check if the comment text is a GIF shortcode
      if (!gifIdToSend && contentToSend) {
        const shortcode = extractGifShortcode(contentToSend);
        if (shortcode) {
          const foundGif = await findGifByShortcode(shortcode);
          if (foundGif) {
            gifIdToSend = foundGif.id;
            contentToSend = ''; // Clear content since we're sending a GIF
            recordGifUsage(foundGif.id, user.id);
          }
        }
      }

      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: contentToSend || '',
        gif_id: gifIdToSend
      });

      if (error) throw error;

      fetchComments();
    } catch (error) {
      console.error('Error sending comment:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleSelectGif = (gif: { id: string; file_original: string }) => {
    setSelectedGif(gif);
    setShowGifPicker(false);
  };

  const handleSelectReplyGif = (gif: { id: string; file_original: string }) => {
    setSelectedReplyGif(gif);
    setShowReplyGifPicker(null);
  };

  const handleSendReply = async (commentId: string) => {
    if ((!replyText.trim() && !selectedReplyGif) || !user) return;

    setSending(true);
    try {
      let gifIdToSend = selectedReplyGif?.id || null;
      let contentToSend = replyText.trim();

      // Check if the reply text is a GIF shortcode
      if (!gifIdToSend && contentToSend) {
        const shortcode = extractGifShortcode(contentToSend);
        if (shortcode) {
          const foundGif = await findGifByShortcode(shortcode);
          if (foundGif) {
            gifIdToSend = foundGif.id;
            contentToSend = ''; // Clear content since we're sending a GIF
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
      setSelectedReplyGif(null);
      setReplyingTo(null);
      fetchComments();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const openDeleteConfirm = (id: string, type: 'comment' | 'reply', ownerId: string) => {
    setItemToDelete({ id, type, ownerId });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !user) return;
    
    const { id, type, ownerId } = itemToDelete;
    const canDelete = ownerId === user.id || isAdmin;
    if (!canDelete) return;

    try {
      if (type === 'comment') {
        let query = supabase.from('post_comments').delete().eq('id', id);
        if (!isAdmin) {
          query = query.eq('user_id', user.id);
        }
        await query;
        toast({ title: 'კომენტარი წაიშალა' });
      } else {
        let query = supabase.from('comment_replies').delete().eq('id', id);
        if (!isAdmin) {
          query = query.eq('user_id', user.id);
        }
        await query;
        toast({ title: 'პასუხი წაიშალა' });
      }
      fetchComments();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteComment = async (commentId: string, ownerId: string) => {
    openDeleteConfirm(commentId, 'comment', ownerId);
  };

  const handleDeleteReply = async (replyId: string, ownerId: string) => {
    openDeleteConfirm(replyId, 'reply', ownerId);
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      if (isLiked) {
        await supabase.from('comment_likes').delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('comment_likes').insert({
          comment_id: commentId,
          user_id: user.id
        });
      }
      fetchComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleLikeReply = async (replyId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      if (isLiked) {
        await supabase.from('reply_likes').delete()
          .eq('reply_id', replyId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('reply_likes').insert({
          reply_id: replyId,
          user_id: user.id
        });
      }
      fetchComments();
    } catch (error) {
      console.error('Error liking reply:', error);
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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={onClose}>
      <div className="bg-card w-full h-full flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header with close button */}
        <div className="flex items-center gap-3 p-3 border-b border-border">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="flex-1 font-semibold text-base">კომენტარები</h3>
        </div>

        {/* Shares count row - only show if there are shares */}
        {sharesCount > 0 && (
          <div className="flex items-center justify-end px-4 py-2 border-b border-border">
            <button className="text-sm text-muted-foreground hover:underline">
              {sharesCount} გაზიარება
            </button>
          </div>
        )}

        {/* Sort dropdown - FB style */}
        <div className="px-4 py-2 border-b border-border">
          <button className="flex items-center gap-1 text-sm font-semibold text-primary">
            ყველა კომენტარი
            <span className="text-xs">▼</span>
          </button>
        </div>

        {/* Comments List - scrollable with custom scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              კომენტარები ჯერ არ არის
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main Comment */}
                <div className="flex gap-3">
                  <button onClick={() => onUserClick?.(comment.user_id)}>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={comment.profile?.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback>
                        {comment.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1">
                    <div className="bg-secondary rounded-2xl px-4 py-2">
                      <StyledUsername
                        userId={comment.user_id}
                        username={comment.profile?.username || 'უცნობი'}
                        className="font-semibold text-sm hover:underline"
                        onClick={() => onUserClick?.(comment.user_id)}
                      />
                      {comment.gif && (
                        <img 
                          src={comment.gif.file_original} 
                          alt={comment.gif.title || 'GIF'}
                          className="max-w-[150px] max-h-[150px] rounded-lg my-2 object-contain"
                        />
                      )}
                      {comment.content && (
                        <StyledText userId={comment.user_id} className="text-sm">
                          {comment.content}
                        </StyledText>
                      )}
                    </div>
                    {/* FB style action row: time · like · reply - all on one line */}
                    <div className="flex items-center gap-3 mt-1.5 px-1 flex-nowrap">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {getTimeAgo(comment.created_at)}
                      </span>
                      <UniversalReactionButton
                        targetType="comment"
                        targetId={comment.id}
                        contentOwnerId={comment.user_id}
                        size="sm"
                        showLabel={true}
                        labelText="მოწონება"
                      />
                      <button 
                        onClick={() => setReplyingTo(comment.id)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap"
                      >
                        პასუხის გაცემა
                      </button>
                      {(user?.id === comment.user_id || isAdmin) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => handleDeleteComment(comment.id, comment.user_id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              წაშლა
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <div className="mt-2 space-y-2">
                        {selectedReplyGif && (
                          <div className="relative inline-block">
                            <img src={selectedReplyGif.file_original} alt="GIF" className="max-h-20 rounded" loading="lazy" />
                            <button 
                              onClick={() => setSelectedReplyGif(null)}
                              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            placeholder={`პასუხი @${comment.profile?.username}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => {
                              const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                              if (e.key === 'Enter' && !isMobile) handleSendReply(comment.id);
                            }}
                            className="flex-1 text-sm"
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setShowReplyGifPicker(comment.id)}
                            className="font-bold text-primary px-2 text-xs"
                          >
                            GIF
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSendReply(comment.id)}
                            disabled={(!replyText.trim() && !selectedReplyGif) || sending}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => { setReplyingTo(null); setReplyText(''); setSelectedReplyGif(null); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-12 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <button onClick={() => onUserClick?.(reply.user_id)}>
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={reply.profile?.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="text-xs">
                              {reply.profile?.username?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1">
                          <div className="bg-secondary/70 rounded-2xl px-3 py-1.5">
                            <StyledUsername
                              userId={reply.user_id}
                              username={reply.profile?.username || 'უცნობი'}
                              className="font-semibold text-xs hover:underline"
                              onClick={() => onUserClick?.(reply.user_id)}
                            />
                            {reply.gif && (
                              <img 
                                src={reply.gif.file_original} 
                                alt={reply.gif.title || 'GIF'}
                                className="max-w-[150px] max-h-[150px] rounded-lg my-1 object-contain"
                              />
                            )}
                            {reply.content && <p className="text-sm">{reply.content}</p>}
                          </div>
                          {/* FB style action row for replies - all on one line */}
                          <div className="flex items-center gap-3 mt-0.5 px-1 flex-nowrap">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {getTimeAgo(reply.created_at)}
                            </span>
                            <UniversalReactionButton
                              targetType="reply"
                              targetId={reply.id}
                              contentOwnerId={reply.user_id}
                              size="sm"
                              showLabel={true}
                              labelText="მოწონება"
                            />
                            <button 
                              onClick={() => setReplyingTo(comment.id)}
                              className="text-xs font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap"
                            >
                              პასუხის გაცემა
                            </button>
                            {(user?.id === reply.user_id || isAdmin) && (
                              <button 
                                onClick={() => handleDeleteReply(reply.id, reply.user_id)}
                                className="text-xs text-muted-foreground hover:text-destructive"
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
            ))
          )}
        </div>

        {/* Comment Input - FB style with avatar */}
        <div className="p-3 border-t border-border bg-card">
          {selectedGif && (
            <div className="relative inline-block mb-2">
              <img src={selectedGif.file_original} alt="GIF" className="max-h-24 rounded" />
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
              <AvatarFallback className="text-xs">
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-1 bg-secondary rounded-full px-3 py-1">
              <button
                onClick={() => setShowGifPicker(true)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                GIF
              </button>
              <Textarea
                placeholder="დაწერე კომენტარი..."
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                }}
                onKeyDown={(e) => {
                  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                  if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                rows={1}
                className="flex-1 min-h-[32px] max-h-[80px] py-1 resize-none overflow-y-auto bg-transparent border-0 focus-visible:ring-0 text-sm leading-5"
                style={{ height: 'auto' }}
              />
            </div>
            {(commentText.trim() || selectedGif) && (
              <button 
                onClick={handleSendComment}
                disabled={(!commentText.trim() && !selectedGif) || sending}
                className="text-primary hover:text-primary/80 font-semibold text-sm"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'გაგზავნა'
                )}
              </button>
            )}
          </div>
        </div>

        {/* GIF Picker Modals */}
        {showGifPicker && (
          <GifPicker 
            onSelect={handleSelectGif}
            onClose={() => setShowGifPicker(false)}
          />
        )}
        {showReplyGifPicker && (
          <GifPicker 
            onSelect={handleSelectReplyGif}
            onClose={() => setShowReplyGifPicker(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            setDeleteConfirmOpen(open);
            if (!open) setItemToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title={itemToDelete?.type === 'comment' ? 'კომენტარის წაშლა' : 'პასუხის წაშლა'}
          description="დარწმუნებული ხართ რომ გსურთ წაშლა? ეს ქმედება ვერ გაუქმდება."
        />
      </div>
    </div>
  );
};

export default CommentsModal;
