import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, MoreVertical, VolumeX, EyeOff, ChevronLeft, ChevronRight, Music, Volume2, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useStoryReactions, useStoryViews, useStoryComments, useStoryMute } from './hooks';
import { logAdminAction } from '@/hooks/useAdminActionLog';
import { FONT_STYLES, type Story } from './types';
import { cn } from '@/lib/utils';
import StoryBottomBar from './StoryBottomBar';
import StoryCommentsSheet from './StoryCommentsSheet';
import StoryViewersSheet from './StoryViewersSheet';
import StoryReactionsSheet from './StoryReactionsSheet';

interface StoryViewerEnhancedProps {
  userId: string;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
  prefetchedStories?: Story[];
  onNextUser?: () => void;
  onPrevUser?: () => void;
  hasNextUser?: boolean;
  hasPrevUser?: boolean;
}

const StoryViewerEnhanced = memo(function StoryViewerEnhanced({ 
  userId, 
  onClose, 
  onUserClick,
  prefetchedStories,
  onNextUser,
  onPrevUser,
  hasNextUser = false,
  hasPrevUser = false
}: StoryViewerEnhancedProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>(prefetchedStories || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!prefetchedStories || prefetchedStories.length === 0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Sheets state
  const [showComments, setShowComments] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  
  // Lyrics state
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[] | null>(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const storyAudioRef = useRef<HTMLAudioElement | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';
  const isModerator = userRole === 'moderator' || userRole === 'admin' || isSuperAdmin;
  const currentStory = stories[currentIndex];
  const isOwner = user?.id === currentStory?.user_id;
  const canDelete = isOwner || isModerator;
  
  // Check if story expired
  const isExpired = currentStory && new Date(currentStory.expires_at) < new Date();

  // Hooks
  const { 
    userReaction, 
    reactionCounts, 
    reactionsCount,
    addReaction 
  } = useStoryReactions(currentStory?.id || '', currentStory?.user_id);
  
  const { 
    viewsCount,
    startViewTracking,
    cancelViewTracking,
    reset: resetViews,
    resetState: resetViewsState
  } = useStoryViews(currentStory?.id || '', currentStory?.user_id || '');

  const {
    commentsCount,
    addComment
  } = useStoryComments(currentStory?.id || '', currentStory?.user_id || '');
  
  const { muteUser, unmuteUser, hideUser, unhideUser, isUserMuted, isUserHidden } = useStoryMute();

  // Fetch stories for user - only if not prefetched
  useEffect(() => {
    if (prefetchedStories && prefetchedStories.length > 0) return;

    const fetchStories = async () => {
      try {
        const [storiesRes, profileRes] = await Promise.all([
          supabase
            .from('stories')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'approved')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: true }),
          supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .eq('user_id', userId)
            .single()
        ]);

        if (storiesRes.error) throw storiesRes.error;

        if (storiesRes.data && storiesRes.data.length > 0) {
          setStories(storiesRes.data.map(s => ({
            ...s,
            story_type: (s.story_type || 'photo') as 'photo' | 'video' | 'text',
            duration_seconds: s.duration_seconds || 30,
            text_content: s.text_content as any,
            profile: profileRes.data || undefined
          })) as Story[]);
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [userId, prefetchedStories]);

  // Progress timer - pause when any sheet/menu is open
  useEffect(() => {
    if (loading || stories.length === 0 || isPaused || showDeleteConfirm || menuOpen || showComments || showViewers || showReactions || isExpired) {
      cancelViewTracking();
      return;
    }

    const duration = 30 * 1000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    startViewTracking();

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      clearInterval(timer);
      cancelViewTracking();
    };
  }, [loading, stories.length, currentIndex, isPaused, showDeleteConfirm, menuOpen, showComments, showViewers, showReactions, isExpired, currentStory?.duration_seconds, startViewTracking, cancelViewTracking, onClose]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    resetViewsState();

    if (currentStory?.story_type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    // Handle story music playback
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current = null;
      setMusicPlaying(false);
    }
    setLyrics(null);
    setCurrentLyricIndex(-1);
    setPlainLyrics(null);

    if (currentStory?.music_url) {
      const startTime = (currentStory as any).music_start_time || 0;
      const deezerId = (currentStory as any).music_deezer_id;

      const playAudio = (url: string) => {
        const audio = new Audio(url);
        audio.loop = true;
        audio.addEventListener('loadedmetadata', () => {
          audio.currentTime = startTime;
        });
        storyAudioRef.current = audio;
        
        // Strategy: try unmuted first with full volume
        audio.volume = 0.6;
        audio.muted = false;
        audio.play()
          .then(() => {
            setMusicPlaying(true);
          })
          .catch(() => {
            // Autoplay blocked — set volume to 0 (not muted) so 
            // user tap can just raise volume without needing new play()
            audio.volume = 0;
            audio.muted = false;
            audio.play()
              .then(() => {
                setMusicPlaying(false); // shows mute icon
              })
              .catch(() => {
                // Complete failure — try muted as last resort
                audio.muted = true;
                audio.play()
                  .then(() => setMusicPlaying(false))
                  .catch(() => {});
              });
          });
      };

      // Fetch fresh Deezer preview URL via edge function (direct Deezer API is CORS-blocked)
      const fetchFreshUrl = async (): Promise<string | null> => {
        try {
          if (deezerId) {
            const { data } = await supabase.functions.invoke('music-search', {
              body: { type: 'refresh', deezerId }
            });
            if (data?.previewUrl) return data.previewUrl;
          }
          // Fallback: search by title/artist
          const titleParts = currentStory.music_title?.split(' - ') || [];
          const searchTitle = titleParts[0]?.trim() || '';
          const searchArtist = (currentStory as any).music_artist || titleParts[1]?.trim() || '';
          if (searchTitle) {
            const q = searchArtist ? `${searchArtist} ${searchTitle}` : searchTitle;
            const { data } = await supabase.functions.invoke('music-search', {
              body: { type: 'search', query: q }
            });
            if (data?.tracks?.[0]?.preview_url) return data.tracks[0].preview_url;
          }
        } catch (e) {
          console.warn('Fresh URL fetch failed:', e);
        }
        return null;
      };

      fetchFreshUrl().then(freshUrl => {
        playAudio(freshUrl || currentStory.music_url!);
      });

      // Fetch lyrics
      const titleParts = currentStory.music_title?.split(' - ') || [];
      const trackTitle = titleParts[0]?.trim() || '';
      const trackArtist = (currentStory as any).music_artist || titleParts[1]?.trim() || '';
      
      if (trackTitle) {
        supabase.functions.invoke('lyrics-search', {
          body: { title: trackTitle, artist: trackArtist }
        }).then(({ data }) => {
          if (data?.found) {
            if (data.syncedLyrics && data.syncedLyrics.length > 0) {
              setLyrics(data.syncedLyrics);
            } else if (data.plainLyrics) {
              setPlainLyrics(data.plainLyrics);
            }
          }
        }).catch(() => {});
      }
    }

    return () => {
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
        storyAudioRef.current = null;
        setMusicPlaying(false);
      }
    };
  }, [currentIndex, currentStory?.story_type, currentStory?.music_url, resetViewsState]);

  // Update current lyric based on audio time
  useEffect(() => {
    if (!lyrics || !storyAudioRef.current || !musicPlaying) return;
    
    const interval = setInterval(() => {
      if (!storyAudioRef.current) return;
      const currentTime = storyAudioRef.current.currentTime;
      let idx = -1;
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) {
          idx = i;
          break;
        }
      }
      setCurrentLyricIndex(idx);
    }, 200);
    
    return () => clearInterval(interval);
  }, [lyrics, musicPlaying]);

  // Real-time subscription for story stats
  useEffect(() => {
    if (!currentStory?.id) return;

    const channel = supabase
      .channel(`story-stats-${currentStory.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `id=eq.${currentStory.id}`
        },
        (payload) => {
          const updated = payload.new as any;
          setStories(prev => prev.map(s => 
            s.id === currentStory.id 
              ? { 
                  ...s, 
                  unique_views: updated.unique_views,
                  total_reactions: updated.total_reactions,
                  total_replies: updated.total_replies,
                  total_comments: updated.total_comments
                } 
              : s
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStory?.id]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (hasNextUser && onNextUser) {
      onNextUser();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose, hasNextUser, onNextUser]);

  const handlePrevUser = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(0);
    } else if (hasPrevUser && onPrevUser) {
      onPrevUser();
    }
  }, [currentIndex, hasPrevUser, onPrevUser]);

  const handleDeleteStory = async () => {
    if (!canDelete || !currentStory) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', currentStory.id);

      if (error) throw error;

      toast({ title: 'წაიშალა', description: 'სთორი წარმატებით წაიშალა' });

      const newStories = stories.filter((_, idx) => idx !== currentIndex);
      
      if (newStories.length === 0) {
        onClose();
      } else {
        setStories(newStories);
        if (currentIndex >= newStories.length) {
          setCurrentIndex(newStories.length - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({ title: 'შეცდომა', description: 'სთორის წაშლა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReaction = useCallback((type: string) => {
    if (isExpired) return;
    addReaction(type);
  }, [addReaction, isExpired]);

  const handleComment = useCallback(async (text: string) => {
    if (isExpired) return;
    const success = await addComment(text);
    if (success) {
      toast({ title: 'გაიგზავნა', description: 'კომენტარი დაემატა' });
    }
  }, [addComment, toast, isExpired]);

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>,
      document.body
    );
  }

  if (stories.length === 0) {
    onClose();
    return null;
  }

  const content = (
    <div className="fixed inset-0 z-[100] bg-black/90 lg:flex lg:items-center lg:justify-center touch-none" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div 
      ref={containerRef}
      className="relative w-full h-full lg:w-[420px] lg:h-[90vh] lg:max-h-[800px] lg:rounded-2xl lg:overflow-hidden bg-black flex flex-col lg:shadow-2xl"
    >
      {/* Progress bars + timer */}
      <div className="absolute top-0 left-0 right-0 z-10 p-2 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1 flex-1">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-50"
                  style={{ 
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>
          <span className="text-white/70 text-[10px] font-mono tabular-nums min-w-[20px] text-right">
            {Math.floor((progress / 100) * 30)}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-3 py-2">
        <button
          onClick={() => onUserClick?.(currentStory.user_id)}
          className="flex items-center gap-2"
        >
          <Avatar className="w-9 h-9 ring-2 ring-white/50">
            <AvatarImage src={currentStory.profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {currentStory.profile?.username?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{currentStory.profile?.username}</p>
            <p className="text-white/60 text-xs">
              {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true, locale: ka })}
            </p>
            {(currentStory as any).status === 'pending' && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/80 text-white text-[10px] font-medium">
                მოლოდინში
              </span>
            )}
          </div>
        </button>
        
        <div className="flex items-center gap-2">
          {/* More options menu */}
          <DropdownMenu 
            modal={false} 
            open={menuOpen} 
            onOpenChange={(open) => {
              setMenuOpen(open);
              setIsPaused(open);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button 
                className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 z-[9999] bg-popover border border-border shadow-xl"
              sideOffset={5}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {!isOwner && (
                <>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault();
                      const targetId = currentStory.user_id;
                      if (isUserMuted(targetId)) {
                        unmuteUser(targetId);
                      } else {
                        muteUser(targetId);
                      }
                      setMenuOpen(false);
                    }}
                  >
                    <VolumeX className="w-4 h-4 mr-2" />
                    {isUserMuted(currentStory.user_id) ? 'მიუტის მოხსნა' : 'სთორების დამუტება'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault();
                      const targetId = currentStory.user_id;
                      if (isUserHidden(targetId)) {
                        unhideUser(targetId);
                      } else {
                        hideUser(targetId);
                      }
                      setMenuOpen(false);
                    }}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    {isUserHidden(currentStory.user_id) ? 'დამალვის მოხსნა' : 'სთორების დამალვა'}
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  {isModerator && !isOwner && (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground opacity-60 pointer-events-none">
                      <Shield className="w-4 h-4 mr-2" />
                      მოდერაცია
                    </DropdownMenuItem>
                  )}
                  {isModerator && !isOwner && (currentStory as any).status !== 'approved' && (
                    <DropdownMenuItem 
                      onSelect={async (e) => {
                        e.preventDefault();
                        try {
                          const { error } = await supabase
                            .from('stories')
                            .update({ status: 'approved' } as any)
                            .eq('id', currentStory.id);
                          if (error) throw error;
                          
                          await logAdminAction({
                            actionType: 'approve',
                            actionCategory: 'content',
                            targetUserId: currentStory.user_id,
                            targetContentId: currentStory.id,
                            targetContentType: 'story',
                            description: `სთორი დადასტურდა: ${currentStory.profile?.username || 'unknown'} - ${currentStory.story_type}`
                          });
                          
                          toast({ 
                            title: '✅ სთორი დადასტურებულია', 
                            description: `${currentStory.profile?.username || 'მომხმარებლის'} ${currentStory.story_type === 'video' ? 'ვიდეო' : currentStory.story_type === 'text' ? 'ტექსტური' : 'ფოტო'} სთორი დადასტურდა` 
                          });
                        } catch (err) {
                          toast({ title: 'შეცდომა', description: 'სთორის დადასტურება ვერ მოხერხდა', variant: 'destructive' });
                        }
                        setMenuOpen(false);
                      }}
                      className="text-green-600 focus:text-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      სთორის დადასტურება
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowDeleteConfirm(true);
                      setMenuOpen(false);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isModerator && !isOwner ? 'სთორის წაშლა (მოდერაცია)' : 'წაშლა'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Glass Music Player */}
      {currentStory?.music_title && (
        <div className="absolute top-20 left-3 right-14 z-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 bg-black/30 backdrop-blur-xl rounded-2xl px-3 py-2 max-w-fit border border-white/10 shadow-lg"
          >
            {(currentStory as any).music_artist && (
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={`https://img.youtube.com/vi/${(currentStory as any).youtube_id || ''}/default.jpg`} 
                  alt="" 
                  className="w-full h-full object-cover blur-[1px]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            {musicPlaying && (
              <div className="flex items-end gap-[2px] h-4">
                {[1,2,3,4].map(i => (
                  <motion.div
                    key={i}
                    className="w-[2px] bg-primary rounded-full"
                    animate={{ height: [4, 12, 6, 14, 4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white/95 text-[11px] font-semibold truncate max-w-[160px]">
                {currentStory.music_title?.split(' - ')?.[0] || currentStory.music_title}
              </p>
              {(currentStory as any).music_artist && (
                <p className="text-white/50 text-[9px] truncate max-w-[140px]">
                  {(currentStory as any).music_artist}
                </p>
              )}
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const audio = storyAudioRef.current;
                if (!audio) return;
                
                if (musicPlaying) {
                  // Currently playing with sound — mute it
                  audio.volume = 0;
                  audio.muted = true;
                  setMusicPlaying(false);
                } else {
                  // User tapped to unmute — this is a user gesture context
                  audio.muted = false;
                  audio.volume = 0.6;
                  if (audio.paused) {
                    // Need to start/resume playback
                    audio.play()
                      .then(() => setMusicPlaying(true))
                      .catch(() => {});
                  } else {
                    // Already playing (was volume=0) — just set state
                    setMusicPlaying(true);
                  }
                }
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="w-6 h-6 flex items-center justify-center relative z-[60]"
            >
              {musicPlaying ? (
                <Volume2 className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-white/50" />
              )}
            </button>
          </motion.div>
        </div>
      )}

      {/* Lyrics Display - Glass Overlay */}
      {musicPlaying && currentStory?.music_title && (lyrics || plainLyrics) && (
        <div className="absolute bottom-36 left-2 right-2 z-10 pointer-events-none">
          <AnimatePresence mode="wait">
            {lyrics && currentLyricIndex >= 0 && (
              <motion.div
                key={currentLyricIndex}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="text-center"
              >
                <p className="text-white text-[15px] font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] px-5 py-2.5 bg-black/25 backdrop-blur-xl rounded-2xl inline-block max-w-full border border-white/5">
                  {lyrics[currentLyricIndex].text}
                </p>
              </motion.div>
            )}
            {!lyrics && plainLyrics && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-white/70 text-xs font-medium drop-shadow-lg px-4 py-2 bg-black/20 backdrop-blur-xl rounded-2xl inline-block max-w-full truncate border border-white/5">
                  🎵 {plainLyrics.split('\n')[0]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Story Content */}
      <div 
        className="flex-1 flex items-center justify-center relative"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Expired overlay */}
        {isExpired && (
          <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center">
            <p className="text-white/80 text-lg font-medium">სთორი ვადაგასულია</p>
          </div>
        )}

        {currentStory.story_type === 'photo' && currentStory.image_url && (
          <img 
            src={currentStory.image_url} 
            alt="" 
            className="max-w-full max-h-full object-contain"
          />
        )}
        
        {currentStory.story_type === 'video' && currentStory.video_url && (
          <video 
            ref={videoRef}
            src={currentStory.video_url} 
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted={false}
            playsInline
            loop={false}
          />
        )}
        
        {currentStory.story_type === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center p-8"
            style={{ background: currentStory.background_style || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <p 
              className={cn(
                "text-white text-center text-2xl md:text-4xl",
                FONT_STYLES.find(f => f.id === currentStory.font_style)?.className
              )}
            >
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Navigation areas */}
        <button 
          className="absolute left-0 top-20 bottom-32 w-1/3"
          onClick={currentIndex > 0 ? handlePrev : handlePrevUser}
        />
        <button 
          className="absolute right-0 top-20 bottom-32 w-1/3"
          onClick={handleNext}
        />

        {/* Desktop navigation arrows - Left (inside on mobile) */}
        {(currentIndex > 0 || hasPrevUser) && (
          <button 
            onClick={currentIndex > 0 ? handlePrev : handlePrevUser}
            className="hidden md:flex lg:hidden absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 items-center justify-center text-white hover:bg-black/70 transition-colors shadow-lg"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}
        
        {/* Desktop navigation arrows - Right (inside on mobile) */}
        {(currentIndex < stories.length - 1 || hasNextUser) && (
          <button 
            onClick={handleNext}
            className="hidden md:flex lg:hidden absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 items-center justify-center text-white hover:bg-black/70 transition-colors shadow-lg"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* FB-style Bottom Bar */}
      <StoryBottomBar
        isOwner={isOwner}
        viewsCount={viewsCount}
        reactionsCount={reactionsCount}
        commentsCount={commentsCount}
        userReaction={userReaction}
        reactionCounts={reactionCounts}
        onViewsClick={() => isOwner && setShowViewers(true)}
        onReactionsClick={() => isOwner && setShowReactions(true)}
        onCommentsClick={() => setShowComments(true)}
        onReaction={handleReaction}
        onComment={handleComment}
        disabled={isExpired}
      />

      {/* Sheets */}
      <StoryCommentsSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        storyId={currentStory?.id || ''}
        storyOwnerId={currentStory?.user_id || ''}
      />
      
      <StoryViewersSheet
        isOpen={showViewers}
        onClose={() => setShowViewers(false)}
        storyId={currentStory?.id || ''}
        onUserClick={onUserClick}
      />
      
      <StoryReactionsSheet
        isOpen={showReactions}
        onClose={() => setShowReactions(false)}
        storyId={currentStory?.id || ''}
        onUserClick={onUserClick}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 mx-4 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                <h2 className="text-lg font-semibold">სთორის წაშლა</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                დარწმუნებული ხარ რომ გინდა ამ სთორის წაშლა? ეს მოქმედება შეუქცევადია.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  გაუქმება
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteStory}
                  disabled={deleting}
                >
                  {deleting ? 'იშლება...' : 'წაშლა'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    
    {/* Desktop large arrows outside the story card */}
    {(currentIndex > 0 || hasPrevUser) && (
      <button 
        onClick={currentIndex > 0 ? handlePrev : handlePrevUser}
        className="hidden lg:flex absolute left-[calc(50%-260px)] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>
    )}
    {(currentIndex < stories.length - 1 || hasNextUser) && (
      <button 
        onClick={handleNext}
        className="hidden lg:flex absolute right-[calc(50%-260px)] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <ChevronRight className="w-7 h-7" />
      </button>
    )}
    </div>
  );

  return createPortal(content, document.body);
});

export default StoryViewerEnhanced;
