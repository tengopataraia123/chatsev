import { memo, useState, useEffect } from 'react';
import { Share2, Trash2, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import StyledUsername from '@/components/username/StyledUsername';
import GenderAvatar from '@/components/shared/GenderAvatar';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PostCard from './PostCard';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface ShareFeedCardProps {
  share: {
    id: string;
    user_id: string;
    post_id: string;
    share_text: string | null;
    created_at: string;
    sharer_profile: {
      username: string;
      avatar_url: string | null;
      gender?: string;
    } | null;
    original_post: {
      id: string;
      user_id: string;
      content: string | null;
      image_url: string | null;
      video_url: string | null;
      created_at: string;
      profile: {
        username: string;
        avatar_url: string | null;
        gender?: string;
      } | null;
      likes_count: number;
      comments_count: number;
      is_liked: boolean;
      is_bookmarked: boolean;
    } | null;
  };
  onUserClick?: (userId: string) => void;
  onDelete?: (shareId: string) => void;
  canDelete?: boolean;
}

const ShareFeedCard = memo(({ share, onUserClick, onDelete, canDelete }: ShareFeedCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDeleteShare = canDelete || (user && user.id === share.user_id);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('post_shares')
        .delete()
        .eq('id', share.id);

      if (error) throw error;

      toast({ title: 'გაზიარება წაიშალა' });
      onDelete?.(share.id);
    } catch (error) {
      console.error('Error deleting share:', error);
      toast({ title: 'შეცდომა წაშლისას', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!share.original_post) {
    return null; // Original post was deleted
  }

  const timeAgo = formatDistanceToNow(new Date(share.created_at), { 
    addSuffix: true, 
    locale: ka 
  });

  return (
    <div className="bg-card rounded-none sm:rounded-xl border-b sm:border border-border overflow-hidden">
      {/* Sharer header */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onUserClick?.(share.user_id)}
              className="flex-shrink-0"
            >
              <GenderAvatar
                userId={share.user_id}
                src={share.sharer_profile?.avatar_url}
                gender={share.sharer_profile?.gender}
                className="w-10 h-10"
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onUserClick?.(share.user_id)}
                  className="hover:underline"
                >
                  <StyledUsername 
                    username={share.sharer_profile?.username || 'უცნობი'} 
                    userId={share.user_id}
                    className="font-semibold text-sm"
                  />
                </button>
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  გააზიარა
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>

          {canDeleteShare && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-secondary rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  წაშლა
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Share text/caption */}
        {share.share_text && (
          <p className="mt-3 text-sm whitespace-pre-wrap">{share.share_text}</p>
        )}
      </div>

      {/* Embedded original post */}
      <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 border border-border rounded-lg overflow-hidden">
        <PostCard
          post={{
            id: share.original_post.id,
            author: {
              id: share.original_post.user_id,
              name: share.original_post.profile?.username || 'უცნობი',
              avatar: share.original_post.profile?.avatar_url || '',
              isVerified: false,
              gender: share.original_post.profile?.gender,
            },
            content: share.original_post.content || undefined,
            image: share.original_post.image_url || undefined,
            video: share.original_post.video_url || undefined,
            likes: share.original_post.likes_count,
            comments: share.original_post.comments_count,
            shares: 0,
            isLiked: share.original_post.is_liked,
            isBookmarked: share.original_post.is_bookmarked,
            createdAt: new Date(share.original_post.created_at),
          }}
          onUserClick={onUserClick}
        />
      </div>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="გაზიარების წაშლა"
        description="დარწმუნებული ხართ, რომ გსურთ ამ გაზიარების წაშლა?"
      />
    </div>
  );
});

ShareFeedCard.displayName = 'ShareFeedCard';

export default ShareFeedCard;
