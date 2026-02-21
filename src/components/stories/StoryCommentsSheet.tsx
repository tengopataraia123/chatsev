import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface StoryCommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyOwnerId: string;
  onCommentAdded?: () => void;
}

const StoryCommentsSheet = memo(function StoryCommentsSheet({
  isOpen,
  onClose,
  storyId,
  storyOwnerId,
  onCommentAdded
}: StoryCommentsSheetProps) {
  const { user, userRole } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  
  const isSuperAdmin = userRole === 'super_admin';
  const isOwner = user?.id === storyOwnerId;
  const canModerate = isOwner || isSuperAdmin;

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!storyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('story_comments')
        .select('id, story_id, user_id, content, created_at')
        .eq('story_id', storyId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch profiles for all commenters
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setComments(data.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id)
        })));
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  // Real-time subscription
  useEffect(() => {
    if (!isOpen || !storyId) return;

    const channel = supabase
      .channel(`story-comments-${storyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'story_comments',
          filter: `story_id=eq.${storyId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, storyId, fetchComments]);

  // Scroll to bottom when new comment added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || sending || !user?.id || !storyId) return;

    setSending(true);
    try {
      // Insert comment
      const { error } = await supabase
        .from('story_comments')
        .insert({
          story_id: storyId,
          user_id: user.id,
          content: trimmed
        });

      if (error) throw error;

      // Send notification to story owner (if not self)
      if (storyOwnerId !== user.id) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        await supabase
          .from('notifications')
          .insert({
            user_id: storyOwnerId,
            type: 'story_comment',
            message: `${senderProfile?.username || 'მომხმარებელმა'} დაკომენტარა შენს სთორის: "${trimmed.substring(0, 50)}${trimmed.length > 50 ? '...' : ''}"`,
            from_user_id: user.id,
            related_id: storyId,
            is_read: false
          });
      }

      setCommentText('');
      onCommentAdded?.();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      // Soft delete
      await supabase
        .from('story_comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 inset-x-0 max-h-[70vh] bg-card rounded-t-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold">კომენტარები</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comments list */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                ჯერ კომენტარები არ არის
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={comment.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {comment.profile?.username?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-2xl px-3 py-2">
                      <p className="text-sm font-medium">{comment.profile?.username}</p>
                      <p className="text-sm break-words">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ka })}
                    </p>
                  </div>
                  {/* Delete option */}
                  {(canModerate || comment.user_id === user?.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[200]">
                        <DropdownMenuItem
                          onClick={() => handleDelete(comment.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          წაშლა
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="დაწერე კომენტარი..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              maxLength={500}
              disabled={sending}
            />
            <Button
              onClick={handleSubmit}
              disabled={!commentText.trim() || sending}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default StoryCommentsSheet;
