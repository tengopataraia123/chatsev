import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Video, 
  Check, 
  X, 
  Trash2, 
  Eye,
  Clock,
  FileVideo,
  Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { logAdminAction } from '@/hooks/useAdminActionLog';
import VideoEmbed from '@/components/shared/VideoEmbed';

interface PendingVideo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  status: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  };
}

export const VideoModeration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideo, setPreviewVideo] = useState<PendingVideo | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingVideos();
  }, []);

  const fetchPendingVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data || []).map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const videosWithProfiles = (data || []).map(video => ({
        ...video,
        profile: profilesMap.get(video.user_id)
      }));

      setVideos(videosWithProfiles);
    } catch (error) {
      console.error('Error fetching pending videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (videoId: string) => {
    setProcessingId(videoId);
    const video = videos.find(v => v.id === videoId);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status: 'approved' })
        .eq('id', videoId);

      if (error) throw error;

      await logAdminAction({
        actionType: 'approve',
        actionCategory: 'content',
        targetUserId: video?.user_id,
        targetContentId: videoId,
        targetContentType: 'video',
        description: `ვიდეო დადასტურდა: ${video?.title || 'უცნობი'}`,
        metadata: { video_title: video?.title }
      });

      toast({
        title: 'დადასტურებულია',
        description: 'ვიდეო წარმატებით დადასტურდა'
      });

      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error: any) {
      toast({
        title: 'შეცდომა',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (videoId: string) => {
    setProcessingId(videoId);
    const video = videos.find(v => v.id === videoId);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status: 'rejected' })
        .eq('id', videoId);

      if (error) throw error;

      await logAdminAction({
        actionType: 'reject',
        actionCategory: 'content',
        targetUserId: video?.user_id,
        targetContentId: videoId,
        targetContentType: 'video',
        description: `ვიდეო უარყოფილია: ${video?.title || 'უცნობი'}`,
        metadata: { video_title: video?.title }
      });

      toast({
        title: 'უარყოფილია',
        description: 'ვიდეო უარყოფილია'
      });

      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error: any) {
      toast({
        title: 'შეცდომა',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (video: PendingVideo) => {
    if (!confirm('დარწმუნებული ხართ, რომ გსურთ ვიდეოს წაშლა?')) return;

    setProcessingId(video.id);
    try {
      // Delete from storage
      const urlParts = video.video_url.split('/');
      const filePath = urlParts.slice(-2).join('/');
      
      await supabase.storage
        .from('videos')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      await logAdminAction({
        actionType: 'delete',
        actionCategory: 'content',
        targetUserId: video.user_id,
        targetContentId: video.id,
        targetContentType: 'video',
        description: `ვიდეო წაიშალა: ${video.title}`,
        metadata: { video_title: video.title }
      });

      toast({
        title: 'წაშლილია',
        description: 'ვიდეო წარმატებით წაიშალა'
      });

      setVideos(prev => prev.filter(v => v.id !== video.id));
    } catch (error: any) {
      toast({
        title: 'შეცდომა',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'უცნობი';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'უცნობი';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Video className="h-4 w-4 text-primary" />
            მოლოდინში ({videos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {videos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <FileVideo className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">მოლოდინში ვიდეო არ არის</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
              <div className="space-y-3">
                {videos.map(video => (
                  <div 
                    key={video.id} 
                    className="p-3 rounded-lg bg-card border border-border/50 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={video.profile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {video.profile?.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{video.profile?.username}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(video.created_at), 'dd.MM.yy HH:mm')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        მოლოდინში
                      </Badge>
                    </div>

                    {/* Video Info */}
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{video.title}</h4>
                      {video.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>ზომა: {formatFileSize(video.file_size)}</span>
                        <span>ხანგრძლივობა: {formatDuration(video.duration)}</span>
                      </div>
                    </div>

                    {/* Preview Thumbnail */}
                    {video.thumbnail_url && (
                      <div 
                        className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group"
                        onClick={() => setPreviewVideo(video)}
                      >
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setPreviewVideo(video)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        ნახვა
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(video.id)}
                        disabled={processingId === video.id}
                      >
                        {processingId === video.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            დადასტურება
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-yellow-600 border-yellow-600/50 hover:bg-yellow-600/10"
                        onClick={() => handleReject(video.id)}
                        disabled={processingId === video.id}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 border-red-600/50 hover:bg-red-600/10"
                        onClick={() => handleDelete(video)}
                        disabled={processingId === video.id}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewVideo && (
            <div>
              {previewVideo.video_url ? (
                <video
                  src={previewVideo.video_url}
                  poster={previewVideo.thumbnail_url}
                  controls
                  autoPlay
                  className="w-full aspect-video"
                />
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
                  ვიდეო არ არის ხელმისაწვდომი
                </div>
              )}
              <div className="p-4 space-y-3">
                <div>
                  <h2 className="text-lg font-bold">{previewVideo.title}</h2>
                  {previewVideo.description && (
                    <p className="text-sm text-muted-foreground mt-1">{previewVideo.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={previewVideo.profile?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {previewVideo.profile?.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{previewVideo.profile?.username}</span>
                  <span>•</span>
                  <span>{formatFileSize(previewVideo.file_size)}</span>
                  <span>•</span>
                  <span>{formatDuration(previewVideo.duration)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleApprove(previewVideo.id);
                      setPreviewVideo(null);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    დადასტურება
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-yellow-600 border-yellow-600/50 hover:bg-yellow-600/10"
                    onClick={() => {
                      handleReject(previewVideo.id);
                      setPreviewVideo(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    უარყოფა
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDelete(previewVideo);
                      setPreviewVideo(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
