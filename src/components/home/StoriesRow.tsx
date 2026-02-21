import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useStoryMute } from '@/components/stories/hooks';

// Check if URL is a video
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.wmv', '.ogv'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
};

/**
 * VideoThumbnail — renders first frame of video as a still image (no play button).
 * Uses a hidden <video> to capture a poster frame via canvas.
 */
const VideoThumbnail = memo(({ src }: { src: string }) => {
  const [poster, setPoster] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    video.addEventListener('loadeddata', () => {
      try {
        // Seek to 0.5s for a better frame
        video.currentTime = 0.5;
      } catch {
        cleanup();
      }
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 240;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setPoster(canvas.toDataURL('image/jpeg', 0.7));
        }
      } catch {
        // CORS or other error — fall back to gradient
      }
      cleanup();
    });

    video.addEventListener('error', () => cleanup());

    video.src = src;

    return () => cleanup();
  }, [src]);

  if (poster) {
    return <img src={poster} alt="" className="w-full h-full object-cover" />;
  }

  // Fallback: gradient with play icon indicator
  return (
    <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm">
        <div className="w-0 h-0 border-l-[14px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
      </div>
    </div>
  );
});

interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  content: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface StoriesRowProps {
  onCreateStory: () => void;
  onStoryClick: (userId: string, allUserIds?: string[]) => void;
}

// Reusable avatar component that supports video
const StoryAvatar = ({ 
  avatarUrl, 
  username, 
  className = "w-8 h-8",
  ringClassName = "ring-2 ring-primary"
}: { 
  avatarUrl: string | null | undefined; 
  username: string | null | undefined;
  className?: string;
  ringClassName?: string;
}) => {
  const isVideo = isVideoUrl(avatarUrl);
  
  if (isVideo && avatarUrl) {
    return (
      <div className={`${className} rounded-full overflow-hidden ${ringClassName} bg-muted`}>
        <video 
          src={avatarUrl}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
        />
      </div>
    );
  }
  
  return (
    <Avatar className={`${className} ${ringClassName}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
          {username?.charAt(0) || '?'}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

const STORIES_CACHE_KEY = 'stories_cache_v1';
const STORIES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const getStoriesCache = (): Story[] | null => {
  try {
    const raw = localStorage.getItem(STORIES_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > STORIES_CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const setStoriesCache = (data: Story[]) => {
  try {
    localStorage.setItem(STORIES_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded */ }
};

const StoriesRow = memo(function StoriesRow({ onCreateStory, onStoryClick }: StoriesRowProps) {
  const { user, profile } = useAuth();
  const cached = getStoriesCache();
  const [stories, setStories] = useState<Story[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const { mutedUsers, hiddenUsers } = useStoryMute();

  const fetchStories = useCallback(async () => {
    try {
      // Single query - fetch stories
      const { data, error } = await supabase
        .from('stories')
        .select('id, user_id, image_url, video_url, content, created_at, status')
        .eq('status', 'approved')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) {
        setStories([]);
        setStoriesCache([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs and fetch profiles IN PARALLEL (no waterfall)
      const userIds = [...new Set(data.map(s => s.user_id))];
      
      // Fire profiles fetch immediately (no await on previous result)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Group stories by user (show only one per user)
      const userStoryMap = new Map<string, Story>();
      data.forEach(story => {
        if (!userStoryMap.has(story.user_id)) {
          userStoryMap.set(story.user_id, {
            ...story,
            profile: profileMap.get(story.user_id)
          });
        }
      });

      // Filter out muted and hidden users
      const filteredStories = Array.from(userStoryMap.values()).filter(
        story => !mutedUsers.includes(story.user_id) && !hiddenUsers.includes(story.user_id)
      );
      
      // Sort: own story first, then by newest
      const sortedStories = filteredStories.sort((a, b) => {
        if (user?.id === a.user_id) return -1;
        if (user?.id === b.user_id) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setStories(sortedStories);
      setStoriesCache(sortedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  }, [mutedUsers, hiddenUsers]);

  useEffect(() => {
    fetchStories();

    // Subscribe to stories changes
    const channel = supabase
      .channel('stories-home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories',
      }, () => {
        fetchStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStories]);

  const isOwnAvatarVideo = isVideoUrl(profile?.avatar_url);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Use ResizeObserver to detect when content size changes
    const ro = new ResizeObserver(() => checkScroll());
    ro.observe(el);
    
    // Also check after a short delay for initial render
    const timeout = setTimeout(checkScroll, 100);

    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
      clearTimeout(timeout);
    };
  }, [checkScroll, stories]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b border-border/40 relative group/stories">
      {/* Desktop scroll arrows */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border/50 shadow-lg items-center justify-center text-foreground/70 hover:text-foreground hover:bg-accent transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border/50 shadow-lg items-center justify-center text-foreground/70 hover:text-foreground hover:bg-accent transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      <div ref={scrollRef} className="flex gap-2.5 px-3 py-1.5 overflow-x-auto scrollbar-hide">
        {/* Create Story Button - Large card style like reference */}
        <button
          onClick={onCreateStory}
          className="flex-shrink-0 flex flex-col items-center"
        >
          <div className="relative w-[115px] h-[170px] rounded-2xl overflow-hidden bg-muted border border-border/50 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-300">
            {/* Background - user's photo/video or gradient (rectangular, covers full card) */}
            {profile?.avatar_url ? (
              isOwnAvatarVideo ? (
                <video 
                  src={profile.avatar_url} 
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img 
                  src={profile.avatar_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-purple-500/40" />
            )}
            
            {/* Bottom section with + button */}
            <div className="absolute bottom-0 inset-x-0 bg-card pt-5 pb-2 flex flex-col items-center">
              <div className="absolute -top-4 w-9 h-9 bg-primary rounded-full flex items-center justify-center border-4 border-card">
                <Plus className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground mt-1">სტორი</span>
            </div>
          </div>
        </button>

        {/* User Stories - Large card style */}
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => onStoryClick(story.user_id, stories.map(s => s.user_id))}
            className="flex-shrink-0"
          >
            <div className="relative w-[115px] h-[170px] rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-[2.5px] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 hover:scale-[1.02]">
              <div className="relative w-full h-full rounded-[11px] overflow-hidden bg-background">
                {/* Story image/video */}
                {story.image_url ? (
                  <img 
                    src={story.image_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : story.video_url ? (
                  <VideoThumbnail src={story.video_url} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                    {story.content && (
                      <p className="text-white text-xs p-2 text-center line-clamp-4">{story.content}</p>
                    )}
                  </div>
                )}
                
                {/* Avatar overlay at top - now supports video */}
                <div className="absolute top-2 left-2">
                  <StoryAvatar 
                    avatarUrl={story.profile?.avatar_url}
                    username={story.profile?.username}
                  />
                </div>
                
                {/* Username at bottom */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
                  <span className="text-xs font-semibold text-white truncate block drop-shadow-sm">
                    {story.profile?.username || 'მომხმარებელი'}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* Loading skeleton */}
        {loading && stories.length === 0 && (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0">
                <div className="w-[115px] h-[170px] rounded-xl bg-muted animate-pulse" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
});

export default StoriesRow;
