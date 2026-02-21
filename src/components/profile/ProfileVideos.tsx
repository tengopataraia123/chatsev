import { useState, useEffect } from 'react';
import { Video, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface ProfileVideosProps {
  userId: string;
}

const ProfileVideos = ({ userId }: ProfileVideosProps) => {
  const [videos, setVideos] = useState<{ id: string; video_url: string; thumbnail_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // Get posts with videos and reels
        const { data: posts } = await supabase
          .from('posts')
          .select('id, video_url')
          .eq('user_id', userId)
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false });

        const videoData = posts?.map(p => ({
          id: p.id,
          video_url: p.video_url as string,
          thumbnail_url: null
        })) || [];

        setVideos(videoData);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              ვიდეოები
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            ვიდეოები
            <span className="text-sm text-muted-foreground">({videos.length})</span>
          </h2>
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">ვიდეოები არ არის</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="aspect-video rounded-lg overflow-hidden bg-secondary relative group"
              >
                {playingVideo === video.id ? (
                  <video
                    src={video.video_url}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <button
                    onClick={() => setPlayingVideo(video.id)}
                    className="w-full h-full relative"
                  >
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileVideos;
