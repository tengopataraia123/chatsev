import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, TrendingUp, Clock, Loader2, Search, X, Eye, MoreVertical, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import VideoShareComposer from './VideoShareComposer';
import VideoEmbed from '@/components/shared/VideoEmbed';
import { GenderAvatar } from '@/components/shared/GenderAvatar';
import StyledUsername from '@/components/username/StyledUsername';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useVideoViews } from '@/hooks/useVideoViews';
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

interface Video {
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
  };
}

interface VideosViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

const VideoItem = ({ video, onUserClick, onDelete, canDelete }: { video: Video; onUserClick?: (userId: string) => void; onDelete?: (id: string) => void; canDelete?: boolean }) => {
  const { startEmbedTimer, isViewRecorded } = useVideoViews(video.id);
  const [viewsCount, setViewsCount] = useState(video.unique_views_count || 0);
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<{ user_id: string; username: string; avatar_url: string | null; last_viewed_at: string }[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

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

  const handleViewersClick = () => {
    setShowViewers(true);
    fetchViewers();
  };

  const handleEmbedInteraction = useCallback(() => {
    startEmbedTimer();
  }, [startEmbedTimer]);

  useEffect(() => {
    if (isViewRecorded) {
      setViewsCount(prev => prev + 1);
    }
  }, [isViewRecorded]);

  const isOwner = user?.id === video.user_id;
  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(userRole || '');
  const showDelete = isOwner || isAdmin;

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('videos').delete().eq('id', video.id);
      if (error) throw error;
      toast({ title: 'ვიდეო წაიშალა' });
      onDelete?.(video.id);
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
    setShowDeleteDialog(false);
  };

  const timeAgo = formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ka });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <GenderAvatar
          src={video.profile?.avatar_url}
          gender={video.profile?.gender}
          username={video.profile?.username}
          className="w-10 h-10 cursor-pointer"
          onClick={() => onUserClick?.(video.user_id)}
        />
        <div className="flex-1 min-w-0">
          <StyledUsername
            username={video.profile?.username || 'უცნობი'}
            userId={video.user_id}
            className="font-semibold text-sm"
          />
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        <button onClick={handleViewersClick} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Eye className="w-3.5 h-3.5" />
          <span>{viewsCount}</span>
        </button>
        {showDelete && (
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

      {/* Caption */}
      {video.caption && (
        <div className="px-3 pb-2">
          <p className="text-sm">{video.caption}</p>
        </div>
      )}

      {/* Video Embed */}
      <div onClick={handleEmbedInteraction}>
        <VideoEmbed url={video.original_url} />
      </div>

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
                    onClick={() => {
                      onUserClick?.(viewer.user_id);
                      setShowViewers(false);
                    }}
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

const VideosView = ({ onBack, onUserClick }: VideosViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('videos')
        .select('id, user_id, title, caption, original_url, platform, unique_views_count, created_at')
        .eq('status', 'approved');

      if (sortBy === 'popular') {
        query = query.order('unique_views_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,caption.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(30);
      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data || []).map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, gender')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const videosWithProfiles = (data || []).map(video => ({
        ...video,
        profile: profilesMap.get(video.user_id),
      })) as Video[];

      setVideos(videosWithProfiles);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({ title: 'შეცდომა', description: 'ვიდეოების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [sortBy, searchQuery, toast]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);


  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex-none z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">ვიდეოები</h1>
          </div>

          {user && (
            <Button onClick={() => setShowComposer(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              დამატება
            </Button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="px-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'popular' | 'newest')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="popular" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                ტრენდინგი
              </TabsTrigger>
              <TabsTrigger value="newest" className="gap-2">
                <Clock className="w-4 h-4" />
                ახალი
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">ვიდეოები არ მოიძებნა</h2>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'სცადეთ სხვა საძიებო სიტყვა' : 'გააზიარეთ პირველი ვიდეო!'}
              </p>
              {!searchQuery && user && (
                <Button onClick={() => setShowComposer(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  ვიდეოს დამატება
                </Button>
              )}
            </div>
          ) : (
            videos.map((video) => (
              <VideoItem key={video.id} video={video} onUserClick={onUserClick} onDelete={(id) => setVideos(prev => prev.filter(v => v.id !== id))} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <VideoShareComposer
        open={showComposer}
        onOpenChange={setShowComposer}
        onSuccess={fetchVideos}
      />
    </div>
  );
};

export default VideosView;
