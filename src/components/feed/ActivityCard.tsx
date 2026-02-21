import { useState, useMemo, useCallback, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { 
  Camera, Image, UserCircle, MoreVertical, Trash2, Send,
  Dumbbell, Smile, Ghost, Sparkles, MessageCircleQuestion, 
  Star, Lightbulb, Briefcase, Music, Clock, Trophy, FileText, Video, Eye, Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GenderAvatar } from '@/components/shared/GenderAvatar';
import StyledUsername from '@/components/username/StyledUsername';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import PhotoViewerModal from '@/components/shared/PhotoViewerModal';
import VideoEmbed from '@/components/shared/VideoEmbed';
import { useVideoViews } from '@/hooks/useVideoViews';
import FacebookFeedActions from './FacebookFeedActions';
import FacebookReactionsBar from './FacebookReactionsBar';

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    activity_type: string;
    description: string | null;
    image_url: string | null;
    metadata?: Record<string, any> | null;
    created_at: string;
    profile?: {
      username: string;
      avatar_url: string | null;
      gender?: string;
    } | null;
  };
  onUserClick?: (userId: string) => void;
  onDelete?: (activityId: string) => void;
  canDelete?: boolean;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    gender?: string;
  } | null;
}

const ActivityCard = ({ 
  activity, 
  onUserClick, 
  onDelete, 
  canDelete = false,
}: ActivityCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentsCount, setCommentsCount] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showVideoViewers, setShowVideoViewers] = useState(false);
  const [videoViewers, setVideoViewers] = useState<{ user_id: string; username: string; avatar_url: string | null; last_viewed_at: string }[]>([]);
  const [loadingVideoViewers, setLoadingVideoViewers] = useState(false);
  const [videoViewsCount, setVideoViewsCount] = useState(0);

  // Video view tracking for video_share activities
  const videoId = activity.activity_type === 'video_share' ? (activity.metadata?.video_id as string || '') : '';
  const { startEmbedTimer, isViewRecorded } = useVideoViews(videoId);

  // Fetch video views count for video_share
  useEffect(() => {
    if (activity.activity_type !== 'video_share' || !videoId) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from('video_unique_views')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);
      setVideoViewsCount(count || 0);
    };
    fetchCount();
  }, [activity.activity_type, videoId]);

  useEffect(() => {
    if (isViewRecorded && videoId) {
      setVideoViewsCount(prev => prev + 1);
    }
  }, [isViewRecorded, videoId]);

  const fetchVideoViewers = useCallback(async () => {
    if (!videoId) return;
    setLoadingVideoViewers(true);
    try {
      const { data, error } = await supabase
        .from('video_unique_views')
        .select('viewer_user_id, last_viewed_at')
        .eq('video_id', videoId)
        .order('last_viewed_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.viewer_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setVideoViewers(data.map(v => ({
          user_id: v.viewer_user_id,
          username: profileMap.get(v.viewer_user_id)?.username || 'უცნობი',
          avatar_url: profileMap.get(v.viewer_user_id)?.avatar_url || null,
          last_viewed_at: v.last_viewed_at,
        })));
      } else {
        setVideoViewers([]);
      }
    } catch (err) {
      console.error('Error fetching video viewers:', err);
    } finally {
      setLoadingVideoViewers(false);
    }
  }, [videoId]);

  // Fetch comments count on mount
  useEffect(() => {
    const fetchCommentsCount = async () => {
      const { count } = await supabase
        .from('activity_comments')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id);
      setCommentsCount(count || 0);
    };
    fetchCommentsCount();
  }, [activity.id]);

  const timeAgo = useMemo(() => {
    const distance = formatDistanceToNow(new Date(activity.created_at), {
      addSuffix: false,
      locale: ka,
    });
    // Remove "დაახლოებით" if present and format as "X წინ"
    return distance.replace(/^დაახლოებით\s*/i, '') + ' წინ';
  }, [activity.created_at]);

  const getActivityIcon = useCallback(() => {
    switch (activity.activity_type) {
      case 'profile_photo':
        return <Camera className="w-4 h-4 text-primary" />;
      case 'cover_photo':
        return <Image className="w-4 h-4 text-primary" />;
      case 'album_photo':
        return <Image className="w-4 h-4 text-emerald-500" />;
      case 'workout':
        return <Dumbbell className="w-4 h-4 text-orange-500" />;
      case 'mood_entry':
        return <Smile className="w-4 h-4 text-yellow-500" />;
      case 'confession':
        return <Ghost className="w-4 h-4 text-purple-500" />;
      case 'ai_avatar':
        return <Sparkles className="w-4 h-4 text-pink-500" />;
      case 'qa_answer':
        return <MessageCircleQuestion className="w-4 h-4 text-pink-500" />;
      case 'horoscope_share':
        return <Star className="w-4 h-4 text-indigo-500" />;
      case 'daily_fact_like':
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case 'job_post':
        return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'music_share':
        return <Music className="w-4 h-4 text-green-500" />;
      case 'memory_share':
        return <Clock className="w-4 h-4 text-cyan-500" />;
      case 'challenge_join':
        return <Trophy className="w-4 h-4 text-amber-500" />;
      case 'blog_post':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'video_share':
        return <Video className="w-4 h-4 text-red-500" />;
      default:
        return <UserCircle className="w-4 h-4 text-primary" />;
    }
  }, [activity.activity_type]);

  const getActivityText = useCallback(() => {
    // For horoscope_share, show a short header
    if (activity.activity_type === 'horoscope_share') {
      const firstLine = activity.description?.split('\n')[0] || 'გააზიარა ჰოროსკოპი';
      return firstLine;
    }
    
    // For module activities, description already contains the full text
    if (activity.description && activity.activity_type !== 'profile_photo' && 
        activity.activity_type !== 'cover_photo' && activity.activity_type !== 'album_photo') {
      return activity.description;
    }
    
    switch (activity.activity_type) {
      case 'profile_photo':
        return 'შეცვალა პროფილის ფოტო';
      case 'cover_photo':
        return 'შეცვალა გარეკანის ფოტო';
      case 'album_photo':
        return 'დაამატა ფოტო ალბომში';
      case 'workout':
        return activity.description || 'დაასრულა ვარჯიში';
      case 'mood_entry':
        return activity.description || 'დააფიქსირა განწყობა';
      case 'confession':
        return activity.description || 'გააზიარა კონფესია';
      case 'ai_avatar':
        return activity.description || 'შექმნა AI ავატარი';
      case 'qa_answer':
        return activity.description || 'უპასუხა კითხვას';
      case 'horoscope_share':
        return activity.description || 'გააზიარა ჰოროსკოპი';
      case 'daily_fact_like':
        return activity.description || 'მოიწონა დღის ფაქტი';
      case 'job_post':
        return activity.description || 'გამოაქვეყნა ვაკანსია';
      case 'music_share':
        return activity.description || 'გააზიარა მუსიკა';
      case 'memory_share':
        return activity.description || 'გააზიარა მოგონება';
      case 'challenge_join':
        return activity.description || 'შეუერთდა ჩელენჯს';
      case 'blog_post':
        return activity.description || 'გამოაქვეყნა ბლოგი';
      case 'video_share':
        return activity.description || 'გააზიარა ვიდეო';
      default:
        return activity.description || 'განაახლა პროფილი';
    }
  }, [activity.activity_type, activity.description]);

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/activity/${activity.id}`);
    toast({
      title: 'ბმული დაკოპირდა',
      description: 'აქტივობის ბმული დაკოპირდა ბუფერში',
    });
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const { data: commentsData } = await supabase
        .from('activity_comments')
        .select('id, user_id, content, created_at')
        .eq('activity_id', activity.id)
        .order('created_at', { ascending: true });

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender')
          .in('user_id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setComments(commentsData.map(c => ({
          ...c,
          profile: profilesMap.get(c.user_id) || null
        })));
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleOpenComments = () => {
    setShowCommentsModal(true);
    loadComments();
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('activity_comments')
        .insert({ 
          activity_id: activity.id, 
          user_id: user.id, 
          content: newComment.trim() 
        })
        .select('id, user_id, content, created_at')
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, gender')
        .eq('user_id', user.id)
        .single();

      setComments(prev => [...prev, { ...data, profile }]);
      setCommentsCount(prev => prev + 1);
      setNewComment('');
      toast({ title: 'კომენტარი დაემატა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      // Delete related comments first
      await supabase
        .from('activity_comments')
        .delete()
        .eq('activity_id', activity.id);
      
      // Delete related likes
      await supabase
        .from('activity_likes')
        .delete()
        .eq('activity_id', activity.id);
      
      // Delete the activity itself
      const { error } = await supabase
        .from('user_activities')
        .delete()
        .eq('id', activity.id);
      
      if (error) {
        console.error('Error deleting activity:', error);
        toast({ title: 'შეცდომა წაშლისას', description: error.message, variant: 'destructive' });
        setShowDeleteDialog(false);
        return;
      }
      
      toast({ title: 'აქტივობა წაიშალა' });
      onDelete?.(activity.id);
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({ title: 'შეცდომა წაშლისას', variant: 'destructive' });
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <article className="bg-card rounded-none sm:rounded-xl border-x-0 sm:border-x border-y border-border overflow-hidden">
        {/* Header */}
        <div className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onUserClick?.(activity.user_id)}
            className="flex-shrink-0"
          >
            <GenderAvatar
              src={activity.profile?.avatar_url}
              gender={activity.profile?.gender}
              className="w-10 h-10"
            />
          </button>

          <div className="flex-1 min-w-0">
            <button
              onClick={() => onUserClick?.(activity.user_id)}
              className="font-medium text-foreground hover:underline block"
            >
              <StyledUsername
                username={activity.profile?.username || 'მომხმარებელი'}
                userId={activity.user_id}
              />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              {getActivityIcon()}
              <span>{getActivityText()} · {timeAgo}</span>
            </div>
          </div>

          {/* Actions dropdown for admins/moderators */}
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  წაშლა
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Horoscope Content - special styled section */}
        {activity.activity_type === 'horoscope_share' && activity.description && (
          <div className="px-4 pb-3">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <div className="flex items-start gap-3">
                <Star className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-foreground whitespace-pre-line leading-relaxed">
                    {activity.description.split('\n\n').slice(1).join('\n\n') || activity.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Image - clickable to open viewer */}
        {activity.image_url && (
          <div 
            className="relative cursor-pointer"
            onClick={() => setShowPhotoViewer(true)}
          >
            {activity.activity_type === 'profile_photo' ? (
              <div className="flex justify-center py-4 bg-muted/30">
                <img
                  src={activity.image_url}
                  alt="პროფილის ფოტო"
                  className="w-40 h-40 rounded-full object-cover border-4 border-primary/20 hover:border-primary/40 transition-colors"
                />
              </div>
            ) : activity.activity_type === 'album_photo' ? (
              <img
                src={activity.image_url}
                alt="ალბომის ფოტო"
                className="w-full object-contain hover:opacity-90 transition-opacity"
              />
            ) : (
              <img
                src={activity.image_url}
                alt="გარეკანის ფოტო"
                className="w-full max-h-64 object-cover hover:opacity-90 transition-opacity"
              />
            )}
          </div>
        )}

        {/* Video Embed for video_share activities */}
        {activity.activity_type === 'video_share' && activity.metadata?.video_url && (
          <>
            <div onClick={startEmbedTimer}>
              <VideoEmbed url={activity.metadata.video_url as string} />
            </div>
            {videoId && (
              <div className="px-3 py-1.5">
                <button
                  onClick={() => { setShowVideoViewers(true); fetchVideoViewers(); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{videoViewsCount} ნახვა</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Facebook Reactions Bar */}
        <FacebookReactionsBar
          itemId={activity.id}
          itemType="activity"
          commentsCount={commentsCount}
          onCommentsClick={handleOpenComments}
        />

        {/* Facebook-style Action buttons */}
        <FacebookFeedActions
          itemId={activity.id}
          itemType="activity"
          ownerId={activity.user_id}
          onCommentClick={handleOpenComments}
          onShareClick={handleShare}
          commentsCount={commentsCount}
        />
      </article>

      {/* Photo Viewer Modal */}
      {activity.image_url && (
        <PhotoViewerModal
          isOpen={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
          imageUrl={activity.image_url}
          userId={activity.user_id}
          username={activity.profile?.username || 'მომხმარებელი'}
          avatarUrl={activity.profile?.avatar_url || undefined}
          createdAt={activity.created_at}
          source={activity.activity_type === 'profile_photo' ? 'avatar' : activity.activity_type === 'cover_photo' ? 'cover' : 'media'}
          onUserClick={onUserClick}
        />
      )}

      {/* Comments Modal */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>კომენტარები</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            {loadingComments ? (
              <div className="text-center py-4 text-muted-foreground">იტვირთება...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">ჯერ არ არის კომენტარები</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCommentsModal(false);
                      onUserClick?.(comment.user_id);
                    }}
                  >
                    <GenderAvatar
                      src={comment.profile?.avatar_url}
                      gender={comment.profile?.gender}
                      className="w-8 h-8"
                    />
                  </button>
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                    <button
                      onClick={() => {
                        setShowCommentsModal(false);
                        onUserClick?.(comment.user_id);
                      }}
                      className="font-medium text-sm hover:underline"
                    >
                      <StyledUsername
                        username={comment.profile?.username || 'მომხმარებელი'}
                        userId={comment.user_id}
                      />
                    </button>
                    <p className="text-sm text-foreground">{comment.content}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ka })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {user && (
            <div className="flex gap-2 pt-3 border-t">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="დაწერე კომენტარი..."
                onKeyPress={(e) => {
                  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                  if (e.key === 'Enter' && !isMobile) handleAddComment();
                }}
              />
              <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>აქტივობის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ ამ აქტივობის წაშლა? ეს მოქმედება ვერ გაუქმდება.
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

      {/* Video Viewers Modal */}
      <Dialog open={showVideoViewers} onOpenChange={setShowVideoViewers}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-muted-foreground" />
              ნახვები ({videoViewers.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {loadingVideoViewers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : videoViewers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                ჯერ არავის უნახავს
              </div>
            ) : (
              <div className="space-y-1">
                {videoViewers.map((viewer) => (
                  <button
                    key={viewer.user_id}
                    onClick={() => { onUserClick?.(viewer.user_id); setShowVideoViewers(false); }}
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
    </>
  );
};

export default ActivityCard;