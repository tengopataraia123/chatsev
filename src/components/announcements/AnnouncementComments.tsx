import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Edit2, 
  Trash2, 
  CornerDownRight,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Comment {
  id: string;
  announcement_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  username: string | null;
  avatar_url: string | null;
  reactions_count: number;
  user_reaction: string | null;
}

interface AnnouncementCommentsProps {
  announcementId: string;
}

export const AnnouncementComments = ({ announcementId }: AnnouncementCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check user role
  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['super_admin', 'admin', 'moderator'])
        .maybeSingle();
      setUserRole(data?.role || null);
    };
    checkRole();
  }, [user?.id]);

  const fetchComments = useCallback(async () => {
    if (!announcementId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_announcement_comments', {
        p_announcement_id: announcementId
      });
      
      if (error) throw error;
      setComments((data || []) as Comment[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`announcement-comments-${announcementId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcement_comments',
          filter: `announcement_id=eq.${announcementId}`
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [announcementId, fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user?.id) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('announcement_comments')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
          content: newComment.trim()
        });
      
      if (error) throw error;
      
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user?.id) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('announcement_comments')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
          parent_id: parentId,
          content: replyContent.trim()
        });
      
      if (error) throw error;
      
      setReplyContent('');
      setReplyingTo(null);
      fetchComments();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('announcement_comments')
        .update({ 
          content: editContent.trim(), 
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);
      
      if (error) throw error;
      
      setEditingId(null);
      setEditContent('');
      fetchComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('announcement_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      
      setDeleteConfirmId(null);
      fetchComments();
      toast({ title: 'კომენტარი წაიშალა' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleToggleReaction = async (commentId: string, currentReaction: string | null) => {
    if (!user?.id) return;
    
    try {
      if (currentReaction) {
        // Remove reaction
        await supabase
          .from('announcement_comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        // Add reaction
        await supabase
          .from('announcement_comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: 'like'
          });
      }
      fetchComments();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const canDeleteComment = (comment: Comment) => {
    if (!user?.id) return false;
    // User can delete their own comments
    if (comment.user_id === user.id) return true;
    // Admins can delete any comment
    if (userRole && ['super_admin', 'admin', 'moderator'].includes(userRole)) return true;
    return false;
  };

  const canEditComment = (comment: Comment) => {
    if (!user?.id) return false;
    return comment.user_id === user.id;
  };

  // Organize comments into threads
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={cn("group", isReply && "ml-8 mt-2")}>
      <div className="flex gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.avatar_url || undefined} />
          <AvatarFallback>{comment.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.username || 'მომხმარებელი'}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ka })}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-muted-foreground">(რედაქტირებული)</span>
            )}
          </div>
          
          {editingId === comment.id ? (
            <div className="mt-1 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                  შენახვა
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditContent(''); }}>
                  გაუქმება
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => handleToggleReaction(comment.id, comment.user_reaction)}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                comment.user_reaction ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", comment.user_reaction && "fill-current")} />
              {comment.reactions_count > 0 && <span>{comment.reactions_count}</span>}
            </button>
            
            {!isReply && (
              <button
                onClick={() => { setReplyingTo(comment.id); setReplyContent(''); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
                პასუხი
              </button>
            )}
            
            {(canEditComment(comment) || canDeleteComment(comment)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEditComment(comment) && (
                    <DropdownMenuItem onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      რედაქტირება
                    </DropdownMenuItem>
                  )}
                  {canDeleteComment(comment) && (
                    <DropdownMenuItem 
                      onClick={() => setDeleteConfirmId(comment.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      წაშლა
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="დაწერეთ პასუხი..."
                className="min-h-[50px] text-sm flex-1"
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <Button 
                  size="sm" 
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={submitting || !replyContent.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setReplyingTo(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
          )}
          
          {/* Replies */}
          {getReplies(comment.id).map(reply => renderComment(reply, true))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4" />
        კომენტარები ({comments.length})
      </h4>
      
      {/* New comment input */}
      {user && (
        <div className="flex gap-2 mb-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="დაწერეთ კომენტარი..."
            className="min-h-[60px] text-sm flex-1"
          />
          <Button 
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
            size="icon"
            className="shrink-0"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
      
      {/* Comments list */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-4">
          {rootComments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              კომენტარები არ არის
            </p>
          ) : (
            rootComments.map(comment => renderComment(comment))
          )}
        </div>
      </ScrollArea>
      
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>კომენტარის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ კომენტარის წაშლა?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDeleteComment(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AnnouncementComments;
