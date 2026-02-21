import { useState, useMemo, useCallback, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { MoreVertical, Trash2, Eye, Loader2 } from 'lucide-react';
import { GenderAvatar } from '@/components/shared/GenderAvatar';
import StyledUsername from '@/components/username/StyledUsername';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useVideoViews } from '@/hooks/useVideoViews';
import VideoEmbed from '@/components/shared/VideoEmbed';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import FacebookFeedActions from './FacebookFeedActions';
import FacebookReactionsBar from './FacebookReactionsBar';
import ShareModal from './ShareModal';

interface VideoFeedCardProps {
  video: {
    id: string;
    user_id: string;
    title: string | null;
    caption: string | null;
    original_url: string;
    platform: string;
    unique_views_count: number;
    created_at: string;
    profile?: {
      username: string;
      avatar_url: string | null;
      gender?: string;
    } | null;
  };
  onUserClick?: (userId: string) => void;
  onDelete?: (videoId: string) => void;
  canDelete?: boolean;
}

const VideoFeedCard = ({ video, onUserClick, onDelete, canDelete = false }: VideoFeedCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [viewsCount, setViewsCount] = useState(video.unique_views_count || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<{ user_id: string; username: string; avatar_url: string | null; last_viewed_at: string }[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const { startEmbedTimer, isViewRecorded } = useVideoViews(video.id);

  const fetchViewers = useCallback(async () => {
    setLoadingViewers(true);
    try {
      const { data, error } = await supabase
        .from('video_unique_views')
        .select('viewer_user_id, last_viewed_at')
        .eq('video_id', video.id)
        .order('last_viewed_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.viewer_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setViewers(data.map(v => ({
          user_id: v.viewer_user_id,
          username: profileMap.get(v.viewer_user_id)?.username || 'უცნობი',
          avatar_url: profileMap.get(v.viewer_user_id)?.avatar_url || null,
          last_viewed_at: v.last_viewed_at,
        })));
      } else {
        setViewers([]);
      }
    } catch (err) {
      console.error('Error fetching viewers:', err);
    } finally {
      setLoadingViewers(false);
    }
  }, [video.id]);

  const handleViewersClick = useCallback(() => {
    setShowViewers(true);
    fetchViewers();
  }, [fetchViewers]);

  useEffect(() => {
    if (isViewRecorded) {
      setViewsCount(prev => prev + 1);
    }
  }, [isViewRecorded]);

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ka });
    } catch { return ''; }
  }, [video.created_at]);

  const handleDelete = useCallback(async () => {
    try {
      const { error } = await supabase.from('videos').delete().eq('id', video.id);
      if (error) throw error;
      toast({ title: 'ვიდეო წაიშალა' });
      onDelete?.(video.id);
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
    setShowDeleteDialog(false);
  }, [video.id, onDelete, toast]);

  const canManage = user && (user.id === video.user_id || canDelete);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick?.(video.user_id)}>
          <GenderAvatar
            src={video.profile?.avatar_url}
            gender={video.profile?.gender}
            username={video.profile?.username}
            className="w-10 h-10"
          />
          <div>
            <StyledUsername username={video.profile?.username || 'უცნობი'} userId={video.user_id} className="font-semibold text-sm" />
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleViewersClick} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Eye className="w-3.5 h-3.5" />
            {viewsCount}
          </button>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  წაშლა
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Caption */}
      {video.caption && (
        <div className="px-3 pb-2">
          <p className="text-sm">{video.caption}</p>
        </div>
      )}

      {/* Video Embed */}
      <div onClick={startEmbedTimer}>
        <VideoEmbed url={video.original_url} />
      </div>

      {/* Reactions Bar */}
      <FacebookReactionsBar
        itemId={video.id}
        itemType="video"
        commentsCount={0}
        onCommentsClick={() => {}}
        onUserClick={onUserClick}
      />

      {/* Actions */}
      <FacebookFeedActions
        itemId={video.id}
        itemType="video"
        ownerId={video.user_id}
        onCommentClick={() => {}}
        onShareClick={() => setShowShareModal(true)}
      />

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          postId={video.id}
          postUrl={`${window.location.origin}/video/${video.id}`}
          postTitle={video.title || 'ვიდეო'}
          onClose={() => setShowShareModal(false)}
          onShareComplete={() => setShowShareModal(false)}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ვიდეოს წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ, რომ გსურთ ამ ვიდეოს წაშლა?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Viewers Modal */}
      <Dialog open={showViewers} onOpenChange={setShowViewers}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-muted-foreground" />
              ნახვები ({viewers.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {loadingViewers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                ჯერ არავის უნახავს
              </div>
            ) : (
              <div className="space-y-1">
                {viewers.map((viewer) => (
                  <button
                    key={viewer.user_id}
                    onClick={() => { onUserClick?.(viewer.user_id); setShowViewers(false); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={viewer.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                        {viewer.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm">{viewer.username}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(viewer.last_viewed_at), { addSuffix: true, locale: ka })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoFeedCard;
