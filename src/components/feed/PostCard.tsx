import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { buildMoodSentence } from '@/components/mood/moodData';
import { MoreHorizontal, MessageCircle, Share2, Bookmark, BadgeCheck, Send, Trash2, Users, Globe, ChevronDown, MapPin, Pin, PinOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Post } from '@/types';
import { Input } from '@/components/ui/input';
import CommentsModal from '@/components/comments/CommentsModal';
import InlineComments from '@/components/comments/InlineComments';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import VideoEmbed, { extractVideoUrl } from '@/components/shared/VideoEmbed';
import LinkPreview, { extractLinkUrl } from '@/components/shared/LinkPreview';
import StyledUsername from '@/components/username/StyledUsername';
import StyledText from '@/components/text/StyledText';
import { HashtagMentionText } from '@/components/hashtag';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { ReportButton } from '@/components/reports/ReportButton';
import GenderAvatar from '@/components/shared/GenderAvatar';
import FacebookReactionsBar from './FacebookReactionsBar';
import FacebookActionButtons from './FacebookActionButtons';
import ShareModal from './ShareModal';
import SharesModal from './SharesModal';

import MapPreviewModal from '@/components/location/MapPreviewModal';
import PhotoViewerModal from '@/components/shared/PhotoViewerModal';
import { logAdminAction } from '@/hooks/useAdminActionLog';

interface PrefetchedStyleData {
  style: any;
  vipType: string | null;
  isVerified: boolean;
}

interface PostCardProps {
  post: Post;
  canDeleteFromParent?: boolean;
  onComment?: (postId: string, comment: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
  onDelete?: (postId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  /** Pre-fetched style data to avoid N+1 queries */
  prefetchedStyleData?: PrefetchedStyleData | null;
  /** Super admin controls */
  isSuperAdmin?: boolean;
  onPinToggle?: (postId: string, isPinned: boolean) => void;
}

// Parse background from content and strip group tags
const parseBackgroundFromContent = (content: string | undefined) => {
  if (!content) return { background: '', cleanContent: content };
  // Strip [group:id:name] tags from content
  let cleaned = content.replace(/\[group:[^\]]*\]\n?/g, '').trim();
  const bgMatch = cleaned.match(/^\[bg:(.*?)\]/);
  if (bgMatch) {
    return {
      background: bgMatch[1],
      cleanContent: cleaned.replace(bgMatch[0], '').trim() || undefined
    };
  }
  return { background: '', cleanContent: cleaned || undefined };
};

const PostCard = memo(({ post, canDeleteFromParent, onComment, onShare, onBookmark, onUserClick, onDelete, onGroupClick, onHashtagClick, prefetchedStyleData, isSuperAdmin, onPinToggle }: PostCardProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSharesModal, setShowSharesModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [sharesCount, setSharesCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentsRefreshTrigger, setCommentsRefreshTrigger] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  // Fetch shares count
  useEffect(() => {
    const fetchSharesCount = async () => {
      // Skip for group posts
      if (post.id.startsWith('group-')) {
        setSharesCount(0);
        return;
      }
      const { count } = await supabase
        .from('post_shares')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setSharesCount(count || 0);
    };
    fetchSharesCount();
    // Removed realtime subscription for shares count - not critical for UX
    // This significantly reduces network requests and prevents refresh storms
  }, [post.id]);

  const handleCommentsChange = useCallback(() => {
    setCommentsRefreshTrigger(prev => prev + 1);
  }, []);

  // Check if user can delete: owner or has admin role from parent
  const canDelete = useMemo(() => {
    if (!user) return false;
    if (user.id === post.author.id) return true;
    return canDeleteFromParent || false;
  }, [user, post.author.id, canDeleteFromParent]);

  // Extract background, video URL, and link URL from content
  const { background, videoUrl, linkUrl, displayContent, hasVideo } = useMemo(() => {
    const { background: bg, cleanContent } = parseBackgroundFromContent(post.content);
    
    if (!cleanContent) return { background: bg, videoUrl: null, linkUrl: null, displayContent: null, hasVideo: false };
    
    const url = extractVideoUrl(cleanContent);
    if (url) {
      const contentWithoutVideoUrl = cleanContent.replace(url, '').trim();
      const cleanedContent = contentWithoutVideoUrl.replace(/https?:\/\/[^\s]*\.?/gi, '').trim();
      return { 
        background: bg,
        videoUrl: url, 
        linkUrl: null,
        displayContent: cleanedContent || null,
        hasVideo: true
      };
    }
    
    // Check for general link preview (non-video URLs)
    const generalLinkUrl = extractLinkUrl(cleanContent);
    if (generalLinkUrl) {
      const contentWithoutLinkUrl = cleanContent.replace(generalLinkUrl, '').trim();
      return { 
        background: bg,
        videoUrl: null, 
        linkUrl: generalLinkUrl,
        displayContent: contentWithoutLinkUrl || null,
        hasVideo: false
      };
    }
    
    return { background: bg, videoUrl: null, linkUrl: null, displayContent: cleanContent, hasVideo: false };
  }, [post.content]);

  const timeAgo = useMemo(() => {
    const now = new Date();
    const diffMs = now.getTime() - post.createdAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'ახლახანს';
    if (diffHours < 24) return `${diffHours} სთ`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} დღე`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} კვირა`;
  }, [post.createdAt]);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(post.id);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !user) return;
    
    // Skip for group posts
    if (post.id.startsWith('group-')) {
      console.log('[PostCard] Skipping comment for group post');
      return;
    }
    
    try {
      const { error } = await supabase.from('post_comments').insert({
        post_id: post.id,
        user_id: user.id,
        content: commentText.trim()
      });

      if (error) throw error;

      setCommentText('');
      setCommentsCount(prev => prev + 1);
      handleCommentsChange();
      onComment?.(post.id, commentText);
    } catch (error) {
      console.error('Error sending comment:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      
      if (error) {
        console.error('Error deleting post:', error);
        toast({ title: 'შეცდომა წაშლისას', description: error.message, variant: 'destructive' });
        return;
      }
      
      // Also delete related activity if this post has an image
      if (post.image) {
        await supabase
          .from('user_activities')
          .delete()
          .eq('activity_type', 'album_photo')
          .eq('image_url', post.image);
      }
      
      toast({ title: 'პოსტი წაიშალა' });
      onDelete?.(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle pin/unpin toggle for super admins
  const handlePinToggle = async () => {
    if (!isSuperAdmin || isPinning) return;
    
    setIsPinning(true);
    try {
      if (post.isGloballyPinned) {
        // Unpin
        const { error } = await supabase.rpc('unpin_post_globally', { p_post_id: post.id });
        if (error) throw error;
        toast({ title: '📌 პოსტი მოხსნილია მიმაგრებიდან' });
      } else {
        // Pin
        const { error } = await supabase.rpc('pin_post_globally', { p_post_id: post.id });
        if (error) throw error;
        toast({ title: '📌 პოსტი მიმაგრებულია ფიდის თავში' });
      }
      
      // Notify parent to refresh
      onPinToggle?.(post.id, !post.isGloballyPinned);
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast({ 
        title: 'შეცდომა', 
        description: error.message || 'მიმაგრება ვერ მოხერხდა',
        variant: 'destructive' 
      });
    } finally {
      setIsPinning(false);
    }
  };

  // Check if content is long and should be truncated
  const isLongContent = displayContent && displayContent.length > 200;
  const truncatedContent = isLongContent && !isExpanded 
    ? displayContent.slice(0, 200) + '...'
    : displayContent;

  const postUrl = `${window.location.origin}/post/${post.id}`;

  return (
    <>
      <article className={`post-card post-card-wrapper w-full max-w-full overflow-hidden rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${post.isGloballyPinned ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', boxShadow: 'none' }}>
        {/* Pinned Post Badge */}
        {post.isGloballyPinned && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20">
            <Pin className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-primary">📌 მიმაგრებული პოსტი</span>
          </div>
        )}
        

        {/* Post Header - Facebook style */}
        <div className="flex items-center justify-between p-3">
          <button 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={() => post.author.id && onUserClick?.(post.author.id)}
          >
            <div className="relative">
              <div className="rounded-full p-[2px] bg-gradient-to-tr from-primary/40 via-primary/20 to-accent/30">
                <GenderAvatar
                  userId={post.author.id}
                  src={post.author.avatar}
                  gender={post.author.gender}
                  username={post.author.name}
                  className="w-10 h-10 ring-2 ring-card"
                />
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <StyledUsername 
                  userId={post.author.id} 
                  username={post.author.name}
                  className="font-semibold text-sm hover:underline"
                  prefetchedData={prefetchedStyleData || undefined}
                />
                {post.author.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
                )}
               </div>
               {/* Mood display - short label in header */}
               {post.moodEmoji && post.moodText && (
                 <span className="text-muted-foreground text-xs font-normal">
                   {post.moodType === 'activity' ? 'გააზიარა აქტივობა' : 'გააზიარა გრძნობა'}
                 </span>
               )}
               {post.groupName && (
                 <span className="text-muted-foreground text-xs font-normal">
                   დაპოსტა ჯგუფში <span className="text-primary font-medium cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); post.groupId && onGroupClick?.(post.groupId); }}>{post.groupName}</span>
                 </span>
               )}
              {post.locationName && !post.groupName && (
                <span className="text-muted-foreground text-xs font-normal block">
                  გააზიარა მდებარეობა
                </span>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {hasVideo && <span>დაამატა ვიდეო · </span>}
                <span>{timeAgo}</span>
                <span>·</span>
                <Globe className="w-3 h-3" />
                {/* Location Display */}
                {post.locationName && (
                  <>
                    <span>·</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMapModal(true);
                      }}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      <span className="hover:underline">{post.locationName}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-secondary rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                გაზიარება
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBookmark}>
                <Bookmark className="w-4 h-4 mr-2" />
                {isBookmarked ? 'წაშლა შენახულებიდან' : 'შენახვა'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ReportButton
                contentType="post"
                contentId={post.id}
                reportedUserId={post.author.id}
                contentPreview={post.content}
                variant="menu"
              />
              {/* Super Admin Pin Controls */}
              {isSuperAdmin && !post.groupId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handlePinToggle}
                    disabled={isPinning}
                    className={post.isGloballyPinned ? 'text-orange-500' : 'text-primary'}
                  >
                    {post.isGloballyPinned ? (
                      <>
                        <PinOff className="w-4 h-4 mr-2" />
                        მოხსნა მიმაგრებიდან
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 mr-2" />
                        📌 მიმაგრება ფიდზე
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    წაშლა
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Location Check-in Card - Facebook style */}
        {post.locationName && (() => {
          // Try to extract coordinates from locationFull if lat/lng are null
          let mapLat = post.locationLat;
          let mapLng = post.locationLng;
          
          if (!mapLat && !mapLng && post.locationFull) {
            // Parse coordinates from "53.5556, 9.9863" format
            const coordMatch = post.locationFull.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
            if (coordMatch) {
              mapLat = parseFloat(coordMatch[1]);
              mapLng = parseFloat(coordMatch[2]);
            }
          }
          
          const hasCoordinates = mapLat !== undefined && mapLng !== undefined && !isNaN(mapLat) && !isNaN(mapLng);
          
          return (
            <div className="mx-3 mb-2">
              <button
                onClick={() => setShowMapModal(true)}
                className="w-full overflow-hidden rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                {/* Mini Map Preview */}
                <div className="relative h-36 bg-gradient-to-br from-primary/20 via-secondary to-primary/10">
                  {hasCoordinates ? (
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapLat},${mapLng}&zoom=14`}
                      className="w-full h-full border-0 pointer-events-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                </div>
                
                {/* Location Info */}
                <div className="p-3 bg-card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm truncate">{post.locationName}</p>
                    <p className="text-xs text-muted-foreground truncate">{post.locationFull || post.locationName}</p>
                  </div>
                </div>
              </button>
            </div>
          );
        })()}

        {/* Post Content */}
        {displayContent && (
          <div className={`px-3 pb-2 ${background ? `${background} py-8 text-center` : ''}`}>
            <HashtagMentionText 
              content={truncatedContent || ''}
              onHashtagClick={onHashtagClick}
              onUserClick={async (username) => {
                // Resolve username to userId for navigation
                const { data } = await supabase
                  .from('profiles')
                  .select('user_id')
                  .eq('username', username)
                  .maybeSingle();
                if (data?.user_id && onUserClick) {
                  onUserClick(data.user_id);
                }
              }}
              className={`text-[15px] leading-relaxed ${background ? 'text-white font-semibold text-xl' : 'text-foreground'}`}
            />
            {isLongContent && (
              <button
                onClick={(e) => {
                  if (isExpanded) {
                    const card = (e.target as HTMLElement).closest('.post-card-wrapper');
                    if (card) {
                      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }
                  setIsExpanded(!isExpanded);
                }}
                className="text-primary hover:underline text-sm font-medium mt-1"
              >
                {isExpanded ? 'ნაკლების ნახვა' : 'მეტის ნახვა'}
              </button>
            )}
          </div>
        )}

        {/* Background only post */}
        {background && !displayContent && !videoUrl && !post.image && !post.locationName && (
          <div className={`${background} py-16`} />
        )}

        {/* Mood-only post (no text, no media) - Facebook style status block */}
        {!displayContent && !videoUrl && !post.image && !background && post.moodEmoji && post.moodText && (
          <div className="px-3 pb-3 pt-1">
            <div className="flex items-center gap-3 py-5 px-4 bg-muted/30 rounded-xl">
              <span className="text-5xl leading-none">{post.moodEmoji}</span>
              <span className="text-base font-medium text-foreground">
                {buildMoodSentence(post.moodEmoji, post.moodText, post.moodType)}
              </span>
            </div>
          </div>
        )}

        {/* Video */}
        {videoUrl && (
          <div className="px-0">
            <VideoEmbed url={videoUrl} />
          </div>
        )}

        {/* Link Preview (for non-video URLs) */}
        {linkUrl && !videoUrl && !post.image && (
          <div className="px-4 pb-2">
            <LinkPreview url={linkUrl} />
          </div>
        )}

        {/* Image - with aspect ratio to prevent CLS */}
        {post.image && (
          <div 
            className="bg-secondary cursor-pointer relative overflow-hidden group/img" 
            style={{ minHeight: '200px' }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowPhotoViewer(true);
            }}
          >
            <img
              src={post.image}
              alt="Post content"
              width={600}
              height={400}
              className="w-full max-h-[600px] object-contain pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] group-hover/img:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
            {/* Subtle overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        )}

        {/* Facebook Reactions Bar */}
        <FacebookReactionsBar
          itemId={post.id}
          itemType="post"
          commentsCount={commentsCount}
          sharesCount={sharesCount}
          onCommentsClick={() => setShowCommentsModal(true)}
          onSharesClick={() => setShowSharesModal(true)}
          onUserClick={onUserClick}
        />

        {/* Action Buttons - Facebook style */}
        <FacebookActionButtons
          postId={post.id}
          postOwnerId={post.author.id}
          onCommentClick={() => setShowCommentsModal(true)}
          onShareClick={() => setShowShareModal(true)}
          commentsCount={commentsCount}
        />

        {/* Inline Comments Preview */}
        <div className="px-3 pb-3">
          <InlineComments
            postId={post.id}
            onUserClick={onUserClick}
            refreshTrigger={commentsRefreshTrigger}
          />
        </div>
      </article>

      {/* Modals - rendered via portal to avoid contentVisibility scroll issues */}
      {showCommentsModal && createPortal(
        <CommentsModal
          postId={post.id}
          onClose={() => {
            setShowCommentsModal(false);
            handleCommentsChange();
          }}
          onUserClick={onUserClick}
        />,
        document.body
      )}

      {showShareModal && createPortal(
        <ShareModal
          postId={post.id}
          postUrl={postUrl}
          postTitle={displayContent?.slice(0, 100) || 'პოსტი'}
          onClose={() => setShowShareModal(false)}
          onShareComplete={() => setSharesCount(prev => prev + 1)}
        />,
        document.body
      )}

      {showSharesModal && createPortal(
        <SharesModal
          postId={post.id}
          onClose={() => setShowSharesModal(false)}
          onUserClick={onUserClick}
        />,
        document.body
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="პოსტის წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ამ პოსტის წაშლა? ეს ქმედება ვერ გაუქმდება."
      />

      {/* Map Preview Modal */}
      {post.locationName && (
        <MapPreviewModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          locationName={post.locationName}
          locationFull={post.locationFull || post.locationName}
          lat={post.locationLat}
          lng={post.locationLng}
        />
      )}

      {/* Photo Viewer Modal */}
      {post.image && (
        <PhotoViewerModal
          isOpen={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
          imageUrl={post.image}
          postId={post.id}
          userId={post.author.id}
          username={post.author.name}
          avatarUrl={post.author.avatar}
          createdAt={post.createdAt.toISOString()}
          source="post"
          onUserClick={onUserClick}
          onDelete={() => onDelete?.(post.id)}
        />
      )}
    </>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
