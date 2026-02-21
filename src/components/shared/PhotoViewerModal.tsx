import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, MoreVertical, Download, Bookmark, Trash2, 
  Image, UserCircle, MessageCircle,
  Share2, Loader2, Link2, RefreshCw, UserPlus, UsersRound, Ban,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UniversalReactionButton } from '@/components/reactions';
import { ReportButton } from '@/components/reports/ReportButton';
import StyledUsername from '@/components/username/StyledUsername';
import CommentsModal from '@/components/comments/CommentsModal';
import PhotoZoomContainer from '@/components/shared/PhotoZoomContainer';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

export interface PhotoItem {
  imageUrl: string;
  photoId?: string;
  postId?: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  createdAt?: string;
  source?: 'post' | 'avatar' | 'cover' | 'media';
}

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  photoId?: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  createdAt?: string;
  source?: 'post' | 'avatar' | 'cover' | 'media';
  postId?: string;
  onUserClick?: (userId: string) => void;
  onDelete?: () => void;
  showActions?: boolean;
  // New props for gallery navigation
  photos?: PhotoItem[];
  initialIndex?: number;
}

const PhotoViewerModal = ({
  isOpen,
  onClose,
  imageUrl: singleImageUrl,
  photoId: singlePhotoId,
  userId: singleUserId,
  username: singleUsername,
  avatarUrl: singleAvatarUrl,
  createdAt: singleCreatedAt,
  source: singleSource = 'post',
  postId: singlePostId,
  onUserClick,
  onDelete,
  showActions = true,
  photos = [],
  initialIndex = 0,
}: PhotoViewerModalProps) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Swipe handling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeThreshold = 50;

  // Determine if we're in gallery mode
  const isGalleryMode = photos.length > 1;
  
  // Get current photo data
  const currentPhoto = isGalleryMode ? photos[currentIndex] : null;
  const imageUrl = currentPhoto?.imageUrl || singleImageUrl;
  const photoId = currentPhoto?.photoId || singlePhotoId;
  const userId = currentPhoto?.userId || singleUserId;
  const username = currentPhoto?.username || singleUsername;
  const avatarUrl = currentPhoto?.avatarUrl || singleAvatarUrl;
  const createdAt = currentPhoto?.createdAt || singleCreatedAt;
  const source = currentPhoto?.source || singleSource;
  const postId = currentPhoto?.postId || singlePostId;

  const isOwner = user?.id === userId;
  const canDelete = isOwner || isAdmin;
  
  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);
  
  const goToNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, photos.length]);
  
  // Handle horizontal swipe for navigation
  const handleSwipeStart = (clientX: number, clientY: number) => {
    touchStartRef.current = { x: clientX, y: clientY };
  };
  
  const handleSwipeEnd = (clientX: number) => {
    if (!touchStartRef.current || !isGalleryMode) return;
    
    const deltaX = clientX - touchStartRef.current.x;
    
    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0 && currentIndex > 0) {
        goToPrevious();
      } else if (deltaX < 0 && currentIndex < photos.length - 1) {
        goToNext();
      }
    }
    
    touchStartRef.current = null;
  };
  
  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: 'ფოტო ჩამოტვირთულია' });
    } catch (error) {
      toast({ title: 'შეცდომა ჩამოტვირთვისას', variant: 'destructive' });
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({ title: isBookmarked ? 'ფოტო წაიშალა შენახულებიდან' : 'ფოტო შენახულია' });
  };

  const handleSetAsProfilePic = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast({ title: 'პროფილის ფოტო განახლდა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      if (source === 'post' && postId) {
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) throw error;
      } else if (source === 'avatar') {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('user_id', userId);
        if (error) throw error;
      } else if (source === 'cover') {
        const { error } = await supabase
          .from('profiles')
          .update({ cover_url: null })
          .eq('user_id', userId);
        if (error) throw error;
      }
      
      toast({ title: 'ფოტო წაიშალა' });
      onDelete?.();
      onClose();
    } catch (error) {
      toast({ title: 'შეცდომა წაშლისას', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSetAsCover = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: imageUrl })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast({ title: 'ქოვერის ფოტო განახლდა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleBanUser = async () => {
    if (!isAdmin || !user) return;
    try {
      const { error } = await supabase.from('site_bans').insert({
        user_id: userId,
        banned_by: user.id,
        block_type: 'USER',
        reason: 'ადმინის მიერ დაბლოკილი ფოტოს გამო',
        status: 'ACTIVE'
      });
      
      if (error) throw error;
      toast({ title: 'მომხმარებელი დაბლოკილია' });
    } catch (error) {
      toast({ title: 'შეცდომა დაბლოკვისას', variant: 'destructive' });
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !user || !postId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment('');
      toast({ title: 'კომენტარი დაემატა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const url = postId 
      ? `${window.location.origin}/post/${postId}`
      : `${window.location.origin}/photo/${photoId || userId}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'ბმული დაკოპირდა' });
  };

  const getSourceLabel = () => {
    switch (source) {
      case 'avatar': return 'პროფილის ფოტო';
      case 'cover': return 'გარეკანი';
      default: return 'ფოტო';
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Use postId or generate a unique ID for reactions
  const reactionId = postId || photoId || `photo-${userId}-${createdAt}`;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      style={{ 
        position: 'fixed',
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        width: '100%',
        height: '100%',
        overscrollBehavior: 'contain', 
        touchAction: 'none'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">
            {getSourceLabel()}
            {isGalleryMode && ` (${currentIndex + 1}/${photos.length})`}
          </span>
        </div>
        
        {/* Navigation arrows for desktop */}
        {isGalleryMode && (
          <div className="hidden sm:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNext}
              disabled={currentIndex === photos.length - 1}
              className="disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Author Info */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button 
          className="flex items-center gap-3"
          onClick={() => onUserClick?.(userId)}
        >
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl || ''} />
            <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <StyledUsername 
              userId={userId} 
              username={username} 
              className="font-medium"
            />
            {createdAt && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(createdAt), 'd MMM yyyy', { locale: ka })}
              </p>
            )}
          </div>
        </button>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border border-border z-[110]">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="w-4 h-4 mr-3" />
                ჩამოტვირთვა
              </DropdownMenuItem>
              
              {user && (
                <>
                  <DropdownMenuItem onClick={handleSetAsProfilePic}>
                    <UserCircle className="w-4 h-4 mr-3" />
                    პროფილის ფოტოდ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSetAsCover}>
                    <Image className="w-4 h-4 mr-3" />
                    ქოვერად დაყენება
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link2 className="w-4 h-4 mr-3" />
                ბმულის კოპირება
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleBookmark}>
                <Bookmark className={`w-4 h-4 mr-3 ${isBookmarked ? 'fill-current' : ''}`} />
                შენახვა
              </DropdownMenuItem>
              
              {postId && (
                <>
                  <DropdownMenuSeparator />
                  <ReportButton
                    contentType="post"
                    contentId={postId}
                    reportedUserId={userId}
                    contentPreview={imageUrl}
                    variant="menu"
                  />
                </>
              )}
              
              {/* Admin ban */}
              {isAdmin && !isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleBanUser}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="w-4 h-4 mr-3" />
                    მომხმარებლის დაბლოკვა
                  </DropdownMenuItem>
                </>
              )}
              
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-3" />
                    )}
                    წაშლა
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Image with pinch-to-zoom and swipe navigation */}
      <div 
        className="flex-1 bg-black min-h-0 relative"
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            handleSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={(e) => {
          if (e.changedTouches.length === 1) {
            handleSwipeEnd(e.changedTouches[0].clientX);
          }
        }}
      >
        <PhotoZoomContainer 
          imageUrl={imageUrl} 
          className="w-full h-full"
        />
        
        {/* Navigation arrows overlay for mobile */}
        {isGalleryMode && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white/80 hover:bg-black/70 transition-colors sm:hidden"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {currentIndex < photos.length - 1 && (
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white/80 hover:bg-black/70 transition-colors sm:hidden"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
            
            {/* Dots indicator */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {photos.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex 
                      ? 'bg-white scale-110' 
                      : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reactions & Stats */}
      <div className="border-t border-border bg-background">
        {/* Action Buttons - Facebook style with equal spacing */}
        <div className="flex items-center border-b border-border py-1">
          {/* Like Button with 9 reactions */}
          <div className="flex-1 flex justify-center min-w-0">
            <UniversalReactionButton
              targetType="post"
              targetId={reactionId}
              contentOwnerId={userId}
              size="md"
              showLabel={true}
              labelText="Like"
            />
          </div>
          
          {/* Comment Button */}
          <button 
            onClick={() => setShowCommentsModal(true)}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-muted-foreground hover:bg-secondary/50 rounded-lg transition-colors min-w-0 px-1"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-[11px] sm:text-sm font-medium">კომენტარი</span>
          </button>
          
          {/* Share Button with Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center justify-center gap-1 py-2 text-muted-foreground hover:bg-secondary/50 rounded-lg transition-colors min-w-0 px-1">
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-[11px] sm:text-sm font-medium">გაზიარება</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1 bg-popover border border-border z-50">
              <button
                onClick={() => {
                  toast({ title: 'ფოტო გაზიარდა' });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5 flex-shrink-0" />
                <span>გაზიარება ახლავე</span>
              </button>
              <button
                onClick={() => {
                  toast({ title: 'ფოტო გაზიარდა სიახლეებში' });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5 flex-shrink-0" />
                <span>გაზიარება არხში</span>
              </button>
              <button
                onClick={() => {
                  toast({ title: 'აირჩიეთ მეგობარი გასაზიარებლად' });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary rounded-lg transition-colors"
              >
                <UserPlus className="w-5 h-5 flex-shrink-0" />
                <span>მეგობრისთვის</span>
              </button>
              <button
                onClick={() => {
                  toast({ title: 'აირჩიეთ ჯგუფი გასაზიარებლად' });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary rounded-lg transition-colors"
              >
                <UsersRound className="w-5 h-5 flex-shrink-0" />
                <span>ჯგუფში გაზიარება</span>
              </button>
              <DropdownMenuSeparator />
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary rounded-lg transition-colors"
              >
                <Link2 className="w-5 h-5 flex-shrink-0" />
                <span>ბმულის კოპირება</span>
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Comment Input */}
        {user && (
          <div className="flex items-center gap-2 p-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="დაწერეთ კომენტარი..."
              className="flex-1 bg-secondary border-0 h-9"
              onKeyPress={(e) => {
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                if (e.key === 'Enter' && !isMobile) handleSendComment();
              }}
              disabled={!postId}
            />
          </div>
        )}
      </div>

      {/* Comments Modal */}
      {showCommentsModal && postId && (
        <CommentsModal
          postId={postId}
          onClose={() => setShowCommentsModal(false)}
          onUserClick={onUserClick}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PhotoViewerModal;