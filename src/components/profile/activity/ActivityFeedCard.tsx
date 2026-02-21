import { memo, useState, useMemo, useCallback } from 'react';
import { 
  MoreHorizontal, Globe, Lock, Users, BadgeCheck, 
  Image as ImageIcon, Video, Share2, MessageCircle, 
  Bookmark, Trash2, Camera, UserCircle, FileImage,
  Dumbbell, Smile, Ghost, Sparkles, MessageCircleQuestion,
  Star, Lightbulb, Briefcase, Music, Clock, Trophy, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityItem } from './types';
import GenderAvatar from '@/components/shared/GenderAvatar';
import StyledUsername from '@/components/username/StyledUsername';
import StyledText from '@/components/text/StyledText';
import FacebookReactionsBar from '@/components/feed/FacebookReactionsBar';
import FacebookFeedActions from '@/components/feed/FacebookFeedActions';
import EnhancedShareModal from '@/components/feed/EnhancedShareModal';
import CommentsModal from '@/components/comments/CommentsModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ReportButton } from '@/components/reports/ReportButton';
import VideoEmbed, { extractVideoUrl } from '@/components/shared/VideoEmbed';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActivityFeedCardProps {
  activity: ActivityItem;
  onUserClick?: (userId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onDelete?: (activityId: string) => void;
  canDelete?: boolean;
}

// Helper to get activity label
const getActivityLabel = (activity: ActivityItem): string => {
  // For horoscope shares, show short label
  if (activity.type === 'horoscope_share') {
    const firstLine = activity.activity_description?.split('\n')[0] || 'გააზიარა ჰოროსკოპი';
    return firstLine;
  }
  
  // For module activities, use the description if available
  if (activity.activity_description && [
    'workout', 'mood_entry', 'confession', 'ai_avatar', 'qa_answer',
    'horoscope_share', 'daily_fact_like', 'job_post', 'music_share',
    'memory_share', 'challenge_join', 'blog_post'
  ].includes(activity.type)) {
    return activity.activity_description;
  }
  
  switch (activity.type) {
    case 'post':
      if (activity.image_url) return 'დაამატა ფოტო';
      if (activity.video_url) return 'დაამატა ვიდეო';
      return 'გამოაქვეყნა პოსტი';
    case 'share':
      return 'გაზიარა პოსტი';
    case 'group_post':
      return `დაპოსტა ჯგუფში`;
    case 'profile_photo':
      return 'განაახლა პროფილის ფოტო';
    case 'cover_photo':
      return 'განაახლა გარეკანის ფოტო';
    case 'album_photo':
      return 'დაამატა ფოტო ალბომში';
    case 'video':
      return 'ატვირთა ვიდეო';
    case 'poll':
      return 'შექმნა გამოკითხვა';
    case 'quiz':
      return 'შექმნა ქვიზი';
    case 'workout':
      return 'დაასრულა ვარჯიში';
    case 'mood_entry':
      return 'დააფიქსირა განწყობა';
    case 'confession':
      return 'გააზიარა კონფესია';
    case 'ai_avatar':
      return 'შექმნა AI ავატარი';
    case 'qa_answer':
      return 'უპასუხა კითხვას';
    case 'daily_fact_like':
      return 'მოიწონა დღის ფაქტი';
    case 'job_post':
      return 'გამოაქვეყნა ვაკანსია';
    case 'music_share':
      return 'გააზიარა მუსიკა';
    case 'memory_share':
      return 'გააზიარა მოგონება';
    case 'challenge_join':
      return 'შეუერთდა ჩელენჯს';
    case 'blog_post':
      return 'გამოაქვეყნა ბლოგი';
    default:
      return 'გააქტიურდა';
  }
};

// Helper to get activity icon
const getActivityIcon = (activity: ActivityItem) => {
  switch (activity.type) {
    case 'profile_photo':
      return <UserCircle className="w-3 h-3" />;
    case 'cover_photo':
      return <FileImage className="w-3 h-3" />;
    case 'album_photo':
      return <Camera className="w-3 h-3" />;
    case 'video':
      return <Video className="w-3 h-3" />;
    case 'share':
      return <Share2 className="w-3 h-3" />;
    case 'workout':
      return <Dumbbell className="w-3 h-3 text-orange-500" />;
    case 'mood_entry':
      return <Smile className="w-3 h-3 text-yellow-500" />;
    case 'confession':
      return <Ghost className="w-3 h-3 text-purple-500" />;
    case 'ai_avatar':
      return <Sparkles className="w-3 h-3 text-pink-500" />;
    case 'qa_answer':
      return <MessageCircleQuestion className="w-3 h-3 text-pink-500" />;
    case 'horoscope_share':
      return <Star className="w-3 h-3 text-indigo-500" />;
    case 'daily_fact_like':
      return <Lightbulb className="w-3 h-3 text-amber-500" />;
    case 'job_post':
      return <Briefcase className="w-3 h-3 text-blue-500" />;
    case 'music_share':
      return <Music className="w-3 h-3 text-green-500" />;
    case 'memory_share':
      return <Clock className="w-3 h-3 text-cyan-500" />;
    case 'challenge_join':
      return <Trophy className="w-3 h-3 text-amber-500" />;
    case 'blog_post':
      return <FileText className="w-3 h-3 text-blue-500" />;
    default:
      return null;
  }
};

// Time ago helper
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'ახლახანს';
  if (diffMins < 60) return `${diffMins} წთ`;
  if (diffHours < 24) return `${diffHours} სთ`;
  if (diffDays < 7) return `${diffDays} დღე`;
  
  return date.toLocaleDateString('ka-GE', { 
    day: 'numeric', 
    month: 'short' 
  });
};

// Privacy icon component
const PrivacyIcon = ({ level }: { level: string }) => {
  switch (level) {
    case 'friends':
      return <Users className="w-3 h-3" />;
    case 'onlyme':
      return <Lock className="w-3 h-3" />;
    default:
      return <Globe className="w-3 h-3" />;
  }
};

const ActivityFeedCard = memo(({ 
  activity, 
  onUserClick, 
  onGroupClick,
  onDelete,
  canDelete = false
}: ActivityFeedCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnActivity = user?.id === activity.actor.id;

  // Parse video URL from content
  const { displayContent, videoUrl, hasVideo } = useMemo(() => {
    if (activity.video_url) {
      return { displayContent: activity.content, videoUrl: activity.video_url, hasVideo: true };
    }
    if (!activity.content) {
      return { displayContent: null, videoUrl: null, hasVideo: false };
    }
    const url = extractVideoUrl(activity.content);
    if (url) {
      const cleanedContent = activity.content.replace(url, '').trim();
      return { displayContent: cleanedContent || null, videoUrl: url, hasVideo: true };
    }
    return { displayContent: activity.content, videoUrl: null, hasVideo: false };
  }, [activity.content, activity.video_url]);

  // Content truncation
  const isLongContent = displayContent && displayContent.length > 200;
  const truncatedContent = isLongContent && !isExpanded 
    ? displayContent.slice(0, 200) + '...'
    : displayContent;

  // Get item type for reactions
  const getItemType = (): string => {
    switch (activity.type) {
      case 'post':
      case 'share':
        return 'post';
      case 'group_post':
        return 'group_post';
      default:
        return 'activity';
    }
  };

  const handleDelete = async () => {
    if (!user || isDeleting) return;
    
    setIsDeleting(true);
    try {
      let error;
      
      switch (activity.type) {
        case 'post':
          ({ error } = await supabase.from('posts').delete().eq('id', activity.id));
          break;
        case 'group_post':
          // Groups module removed
          break;
        case 'share':
          ({ error } = await supabase.from('post_shares').delete().eq('id', activity.id));
          break;
        default:
          ({ error } = await supabase.from('user_activities').delete().eq('id', activity.id));
      }

      if (error) throw error;
      
      toast({ title: 'წაიშალა წარმატებით' });
      onDelete?.(activity.id);
    } catch (err) {
      console.error('Error deleting activity:', err);
      toast({ title: 'წაშლა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const postUrl = `${window.location.origin}/post/${activity.id}`;

  return (
    <>
      <article className="bg-card rounded-xl border border-border overflow-hidden w-full" style={{ maxWidth: '100%' }}>
        {/* Group Header (for group posts) */}
        {activity.type === 'group_post' && activity.group && (
          <div className="border-b border-border">
            <button 
              onClick={() => onGroupClick?.(activity.group!.id)}
              className="w-full text-left"
            >
              <div className="relative h-24 sm:h-32">
                {activity.group.cover_url ? (
                  <img 
                    src={activity.group.cover_url} 
                    alt={activity.group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary flex items-center justify-center">
                    <Users className="w-10 h-10 text-primary/50" />
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm flex items-center gap-1">
                  {activity.group.is_private ? (
                    <Lock className="w-3 h-3 text-white" />
                  ) : (
                    <Globe className="w-3 h-3 text-white" />
                  )}
                  <span className="text-white text-xs">
                    {activity.group.is_private ? 'პრივატული' : 'საჯარო'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-secondary/30">
                <h3 className="font-bold truncate hover:underline">{activity.group.name}</h3>
              </div>
            </button>
          </div>
        )}

        {/* Activity Header */}
        <div className="flex items-center justify-between p-3">
          <button 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={() => onUserClick?.(activity.actor.id)}
          >
            <GenderAvatar
              src={activity.actor.avatar_url || undefined}
              gender={activity.actor.gender}
              username={activity.actor.username}
              className="w-10 h-10"
            />
            <div className="text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <StyledUsername 
                  userId={activity.actor.id} 
                  username={activity.actor.username}
                  className="font-semibold text-sm hover:underline"
                />
                {activity.actor.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
                )}
                <span className="text-muted-foreground text-xs">
                  {getActivityLabel(activity)}
                </span>
                {activity.mood_emoji && activity.mood_text && (
                  <span className="text-muted-foreground text-xs">
                    — {activity.mood_text}
                  </span>
                )}
                {activity.group && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onGroupClick?.(activity.group!.id); }}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    • {activity.group.name}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {getActivityIcon(activity)}
                <span>{getTimeAgo(activity.created_at)}</span>
                <span>·</span>
                <PrivacyIcon level={activity.privacy_level} />
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
              <DropdownMenuItem>
                <Bookmark className="w-4 h-4 mr-2" />
                შენახვა
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ReportButton
                contentType="post"
                contentId={activity.id}
                reportedUserId={activity.actor.id}
                contentPreview={activity.content}
                variant="menu"
              />
              {(isOwnActivity || canDelete) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete} 
                    className="text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'იშლება...' : 'წაშლა'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Activity Content */}
        {truncatedContent && (
          <div className="px-3 pb-2">
            <StyledText 
              userId={activity.actor.id} 
              className="text-[15px] leading-relaxed break-words whitespace-pre-wrap"
            >
              {truncatedContent}
            </StyledText>
            {isLongContent && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-muted-foreground hover:underline text-sm font-medium mt-1"
              >
                მეტის ნახვა
              </button>
            )}
          </div>
        )}

        {/* Activity Description (for avatar/cover updates) */}
        {activity.activity_description && !activity.content && (
          <div className="px-3 pb-2">
            <p className="text-[15px] text-muted-foreground">
              {activity.activity_description}
            </p>
          </div>
        )}

        {/* Share - Original Post Preview */}
        {activity.type === 'share' && activity.original_post && (
          <div className="mx-3 mb-3 border border-border rounded-lg overflow-hidden bg-secondary/30">
            {activity.original_post.is_deleted ? (
              <div className="p-4 text-center text-muted-foreground">
                <p className="font-medium">კონტენტი მიუწვდომელია</p>
                <p className="text-sm">ეს პოსტი წაშლილია</p>
              </div>
            ) : (
              <>
                <button 
                  className="w-full text-left p-3 flex items-center gap-2"
                  onClick={() => onUserClick?.(activity.original_post!.author.id)}
                >
                  <GenderAvatar
                    src={activity.original_post.author.avatar_url || undefined}
                    gender={activity.original_post.author.gender}
                    username={activity.original_post.author.username}
                    className="w-8 h-8"
                  />
                  <div>
                    <p className="font-semibold text-sm">
                      {activity.original_post.author.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getTimeAgo(new Date(activity.original_post.created_at))}
                    </p>
                  </div>
                </button>
                {activity.original_post.content && (
                  <p className="px-3 pb-2 text-sm line-clamp-3">
                    {activity.original_post.content}
                  </p>
                )}
                {activity.original_post.image_url && (
                  <img 
                    src={activity.original_post.image_url} 
                    alt="" 
                    className="w-full max-h-[300px] object-cover"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Video */}
        {videoUrl && (
          <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <VideoEmbed url={videoUrl} />
          </div>
        )}

        {/* Image */}
        {activity.image_url && (
          <div className="bg-secondary">
            <img
              src={activity.image_url}
              alt=""
              className="w-full max-h-[500px] object-contain"
              loading="lazy"
            />
          </div>
        )}

        {/* Reactions Bar */}
        {(activity.type === 'post' || activity.type === 'group_post') && (
          <FacebookReactionsBar
            itemId={activity.id}
            itemType={activity.type === 'group_post' ? 'group_post' : 'post'}
            commentsCount={activity.comments_count}
            sharesCount={activity.shares_count}
            onCommentsClick={() => setShowCommentsModal(true)}
            onSharesClick={() => {}}
            onUserClick={onUserClick}
          />
        )}

        {/* Action Buttons */}
        {(activity.type === 'post' || activity.type === 'group_post') && (
          <FacebookFeedActions
            itemId={activity.id}
            itemType={activity.type === 'group_post' ? 'group_post' : 'post'}
            ownerId={activity.actor.id}
            onCommentClick={() => setShowCommentsModal(true)}
            onShareClick={() => setShowShareModal(true)}
          />
        )}
      </article>

      {/* Modals */}
      <AnimatePresence>
        {showShareModal && (
          <EnhancedShareModal
            postId={activity.id}
            postUrl={postUrl}
            postImage={activity.image_url}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>

      {showCommentsModal && (
        <CommentsModal
          postId={activity.id}
          onClose={() => setShowCommentsModal(false)}
          onUserClick={onUserClick}
        />
      )}
    </>
  );
});

ActivityFeedCard.displayName = 'ActivityFeedCard';

export default ActivityFeedCard;
