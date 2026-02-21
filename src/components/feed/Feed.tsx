import React, { useState, useEffect, useCallback, useMemo, memo, useRef, forwardRef } from 'react';
import PostCard from './PostCard';
import ActivityCard from './ActivityCard';
import VideoFeedCard from './VideoFeedCard';
import MovieFeedCard from './MovieFeedCard';
import ShareFeedCard from './ShareFeedCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';
// Quiz module removed
import { FeedSkeleton } from '@/components/shared/SkeletonLoaders';
import { useBatchUserStyles } from '@/hooks/useBatchUserStyles';
import PollFeedItem from '@/components/polls/PollFeedItem';
import SuggestedFriends from './SuggestedFriends';

interface PollData {
  id: string;
  user_id: string;
  created_at: string;
  is_pinned?: boolean;
}

interface ActivityData {
  id: string;
  user_id: string;
  activity_type: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    gender?: string;
  } | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface PostWithDetails {
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
  // Group post fields
  group_id?: string;
  group_name?: string;
  group_cover_url?: string;
  is_group_member?: boolean;
  // Location fields
  location_name?: string;
  location_full?: string;
  location_lat?: number;
  location_lng?: number;
  location_source?: string;
  // Pinned post fields
  is_globally_pinned?: boolean;
  globally_pinned_at?: string;
  globally_pinned_by?: string;
  // Special post types
  post_type?: string;
  metadata?: any;
  // Mood fields
  mood_emoji?: string;
  mood_text?: string;
  mood_type?: string;
}


interface VideoData {
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
  } | null;
}

interface FeedProps {
  onPostInteraction?: (action: string, postId: string) => void;
  onUserClick?: (userId: string) => void;
  onLiveClick?: () => void;
  onGroupClick?: (groupId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  scrollToPostId?: string | null;
  onScrollToPostComplete?: () => void;
}

const FETCH_TIMEOUT = 4000; // 4 seconds - faster timeout
const INITIAL_ITEMS_TO_SHOW = 8; // Show first 8 items immediately for faster FCP

// localStorage cache for instant feed display on reload
const FEED_CACHE_KEY = 'feed_cache_v1';
const FEED_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

interface FeedCache {
  posts: PostWithDetails[];
  pinnedPost: PostWithDetails | null;
  polls: PollData[];
  activities: ActivityData[];
  videos: VideoData[];
  ts: number;
}

const getFeedCache = (): FeedCache | null => {
  try {
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const cache: FeedCache = JSON.parse(raw);
    if (Date.now() - cache.ts > FEED_CACHE_TTL) return null;
    return cache;
  } catch { return null; }
};

const setFeedCache = (data: Omit<FeedCache, 'ts'>) => {
  try {
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch { /* quota exceeded */ }
};

const Feed = memo(forwardRef<HTMLDivElement, FeedProps>(({ onPostInteraction, onUserClick, onLiveClick, onGroupClick, onHashtagClick, scrollToPostId, onScrollToPostComplete }, ref) => {
  const feedCache = getFeedCache();
  const [posts, setPosts] = useState<PostWithDetails[]>(feedCache?.posts || []);
  const [pinnedPost, setPinnedPost] = useState<PostWithDetails | null>(feedCache?.pinnedPost || null);
  const [pinnedPoll, setPinnedPoll] = useState<PollData | null>(null);
  const [polls, setPolls] = useState<PollData[]>(feedCache?.polls || []);
  const [activities, setActivities] = useState<ActivityData[]>(feedCache?.activities || []);
  const [videos, setVideos] = useState<VideoData[]>(feedCache?.videos || []);
  const [movies, setMovies] = useState<any[]>([]);
  const [feedShares, setFeedShares] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, { username: string; avatar_url: string | null; gender?: string; is_verified?: boolean }>>(new Map());
  const [loading, setLoading] = useState(!feedCache);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Stable user ID reference to prevent re-renders
  const userIdRef = React.useRef(user?.id);
  // Live streaming removed

  // Batch fetch all user styles/VIP/verified data for performance
  const allUserIds = useMemo(() => {
    const ids = new Set<string>();
    posts.forEach(p => ids.add(p.user_id));
    activities.forEach(a => ids.add(a.user_id));
    videos.forEach(v => ids.add(v.user_id));
    feedShares.forEach(s => ids.add(s.user_id));
    return Array.from(ids).filter(Boolean);
  }, [posts, activities, videos, feedShares]);
  
  const { stylesMap: userStylesMap } = useBatchUserStyles(allUserIds);

  const fetchPosts = useCallback(async () => {
    setError(null);
    
    try {
      // Fetch ALL content in parallel for instant unified loading
      const [
        postsResult,
        pinnedPostResult,
        groupPostsResult,
        pollsResult,
        pinnedPollResult,
        activitiesResult,
        videosResult,
        moviesResult,
        feedSharesResult,
        superAdminResult
      ] = await Promise.all([
        supabase
          .from('posts')
          .select('id, user_id, content, image_url, video_url, created_at, location_name, location_full, location_lat, location_lng, location_source, is_globally_pinned, globally_pinned_at, globally_pinned_by, post_type, metadata, mood_emoji, mood_text, mood_type')
          .eq('is_approved', true)
          .eq('is_globally_pinned', false) // Exclude pinned post from main query
          .order('created_at', { ascending: false })
          .limit(12),
        // Fetch globally pinned post separately
        supabase
          .from('posts')
          .select('id, user_id, content, image_url, video_url, created_at, location_name, location_full, location_lat, location_lng, location_source, is_globally_pinned, globally_pinned_at, globally_pinned_by, post_type, metadata, mood_emoji, mood_text, mood_type')
          .eq('is_approved', true)
          .eq('is_globally_pinned', true)
          .maybeSingle(),
        Promise.resolve({ data: [] }),
        supabase
          .from('polls')
          .select('id, user_id, created_at, is_pinned')
          .in('status', ['approved', 'pending'])
          .or('is_pinned.is.null,is_pinned.eq.false')
          .order('created_at', { ascending: false })
          .limit(3),
        // Fetch globally pinned poll separately
        supabase
          .from('polls')
          .select('id, user_id, created_at, is_pinned')
          .in('status', ['approved', 'pending'])
          .eq('is_pinned', true)
          .maybeSingle(),
        supabase
          .from('user_activities')
          .select('id, user_id, activity_type, description, image_url, metadata, created_at')
          .neq('activity_type', 'profile_photo')
          .order('created_at', { ascending: false })
          .limit(15),
        // Reels removed - no placeholder needed
        supabase
          .from('videos')
          .select('id, user_id, title, caption, original_url, platform, unique_views_count, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('movies')
          .select('id, title_ka, title_en, year, genres, country, duration_minutes, description_ka, poster_url, age_rating, views_count, created_at, created_by')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('post_shares')
          .select('id, user_id, post_id, share_text, created_at')
          .eq('destination', 'feed')
          .order('created_at', { ascending: false })
          .limit(6),
        // Check if current user is super_admin
        user?.id ? supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle() : Promise.resolve({ data: null }),
      ]);

      const postsData = postsResult.data || [];
      const pinnedPostData = pinnedPostResult.data;
      const groupPostsData = groupPostsResult.data || [];
      const pollsData = (pollsResult.data as any[]) || [];
      const pinnedPollData = (pinnedPollResult as any).data || null;
      const activitiesData = activitiesResult.data || [];
      // reelsData removed
      const videosData = videosResult.data || [];
      const moviesData = moviesResult.data || [];
      const feedSharesData = feedSharesResult.data || [];
      
      // Set super admin status
      setIsSuperAdmin(!!superAdminResult.data);

      // Collect ALL user IDs at once (including pinned post author)
      const allUserIds = [
        ...postsData.map(p => p.user_id),
        ...(pinnedPostData ? [pinnedPostData.user_id] : []),
        ...groupPostsData.map((p: any) => p.user_id),
        ...activitiesData.map((a: any) => a.user_id),
        
        ...videosData.map((v: any) => v.user_id),
        ...feedSharesData.map((s: any) => s.user_id),
        ...moviesData.filter((m: any) => m.created_by).map((m: any) => m.created_by),
      ].filter(Boolean);
      const uniqueUserIds = [...new Set(allUserIds)];

      // Fetch all profiles in one query
      const profilesMapLocal = new Map<string, { username: string; avatar_url: string | null; gender?: string; is_verified?: boolean }>();
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender, is_verified')
          .in('user_id', uniqueUserIds);
        
        profilesData?.forEach(p => {
          profilesMapLocal.set(p.user_id, { 
            username: p.username, 
            avatar_url: p.avatar_url, 
            gender: p.gender || undefined,
            is_verified: p.is_verified || false
          });
        });
      }
      setProfilesMap(profilesMapLocal);

      // Fetch user-specific data (likes, bookmarks, role) in parallel
      const postIds = [...postsData.map(p => p.id), ...(pinnedPostData ? [pinnedPostData.id] : [])];
      const activityIds = activitiesData.map((a: any) => a.id);

      const [userLikesResult, bookmarksResult, roleResult, activityLikesResult, activityUserLikesResult] = await Promise.all([
        user?.id && postIds.length > 0 ? supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds) : Promise.resolve({ data: [] }),
        user?.id && postIds.length > 0 ? supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds) : Promise.resolve({ data: [] }),
        user?.id ? supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        activityIds.length > 0 ? supabase.from('activity_likes').select('activity_id').in('activity_id', activityIds) : Promise.resolve({ data: [] }),
        user?.id && activityIds.length > 0 ? supabase.from('activity_likes').select('activity_id').eq('user_id', user.id).in('activity_id', activityIds) : Promise.resolve({ data: [] }),
      ]);

      const userLikes = new Set((userLikesResult.data || []).map((l: any) => l.post_id));
      const userBookmarks = new Set((bookmarksResult.data || []).map((b: any) => b.post_id));
      setUserRole(roleResult.data?.role || null);

      // Map posts with ALL data
      const mappedPosts: PostWithDetails[] = postsData.map(post => {
        // Extract group info from metadata for group posts
        const meta = post.metadata as any;
        const isGroupPost = post.post_type === 'group_post' && meta;
        // Strip [group:id:name] tag from content (can appear anywhere, not just start)
        const cleanContent = post.content?.replace(/\[group:[^\]]*\]\n?/g, '').trim() || post.content;

        return {
          id: post.id,
          user_id: post.user_id,
          content: cleanContent,
          image_url: post.image_url,
          video_url: post.video_url,
          created_at: post.created_at,
          profile: profilesMapLocal.get(post.user_id) || { username: 'უცნობი', avatar_url: null },
          likes_count: 0,
          comments_count: 0,
          is_liked: userLikes.has(post.id),
          is_bookmarked: userBookmarks.has(post.id),
          group_id: isGroupPost ? meta.group_id : undefined,
          group_name: isGroupPost ? meta.group_name : undefined,
          group_cover_url: isGroupPost ? meta.group_avatar_url : undefined,
          location_name: post.location_name,
          location_full: post.location_full,
          location_lat: post.location_lat,
          location_lng: post.location_lng,
          location_source: post.location_source,
          is_globally_pinned: post.is_globally_pinned,
          globally_pinned_at: post.globally_pinned_at,
          globally_pinned_by: post.globally_pinned_by,
          post_type: post.post_type,
          metadata: post.metadata,
          mood_emoji: (post as any).mood_emoji || undefined,
          mood_text: (post as any).mood_text || undefined,
          mood_type: (post as any).mood_type || undefined,
        };
      });
      
      // Map pinned post if exists
      const mappedPinnedPost: PostWithDetails | null = pinnedPostData ? {
        id: pinnedPostData.id,
        user_id: pinnedPostData.user_id,
        content: pinnedPostData.content,
        image_url: pinnedPostData.image_url,
        video_url: pinnedPostData.video_url,
        created_at: pinnedPostData.created_at,
        profile: profilesMapLocal.get(pinnedPostData.user_id) || { username: 'უცნობი', avatar_url: null },
        likes_count: 0,
        comments_count: 0,
        is_liked: userLikes.has(pinnedPostData.id),
        is_bookmarked: userBookmarks.has(pinnedPostData.id),
        location_name: pinnedPostData.location_name,
        location_full: pinnedPostData.location_full,
        location_lat: pinnedPostData.location_lat,
        location_lng: pinnedPostData.location_lng,
        location_source: pinnedPostData.location_source,
        is_globally_pinned: true,
        globally_pinned_at: pinnedPostData.globally_pinned_at,
        globally_pinned_by: pinnedPostData.globally_pinned_by,
        mood_emoji: (pinnedPostData as any).mood_emoji || undefined,
        mood_text: (pinnedPostData as any).mood_text || undefined,
        mood_type: (pinnedPostData as any).mood_type || undefined,
      } : null;

      // Process activities
      const activityLikesCountMap = new Map<string, number>();
      activityLikesResult.data?.forEach((l: any) => {
        activityLikesCountMap.set(l.activity_id, (activityLikesCountMap.get(l.activity_id) || 0) + 1);
      });
      const userActivityLikes = new Set(activityUserLikesResult.data?.map((l: any) => l.activity_id) || []);


      // Map all secondary content
      const mappedActivities: ActivityData[] = activitiesData.map((activity: any) => ({
        ...activity,
        profile: profilesMapLocal.get(activity.user_id) || { username: 'უცნობი', avatar_url: null },
        likes_count: activityLikesCountMap.get(activity.id) || 0,
        comments_count: 0,
        is_liked: userActivityLikes.has(activity.id),
      }));

      const mappedVideos: VideoData[] = videosData.map((video: any) => ({
        ...video,
        profile: profilesMapLocal.get(video.user_id) || { username: 'უცნობი', avatar_url: null },
      }));

      const mappedMovies = moviesData.map((movie: any) => ({
        ...movie,
        profiles: movie.created_by ? profilesMapLocal.get(movie.created_by) : null
      }));

      // Process feed shares
      let mappedShares: any[] = [];
      const sharedPostIds = feedSharesData.map((s: any) => s.post_id);
      if (sharedPostIds.length > 0) {
        const { data: sharedPosts } = await supabase
          .from('posts')
          .select('id, user_id, content, image_url, video_url, created_at')
          .in('id', sharedPostIds);

        mappedShares = feedSharesData.map((share: any) => {
          const originalPost = sharedPosts?.find(p => p.id === share.post_id);
          return {
            ...share,
            sharerProfile: profilesMapLocal.get(share.user_id) || { username: 'უცნობი', avatar_url: null },
            originalPost: originalPost ? {
              ...originalPost,
              profile: profilesMapLocal.get(originalPost.user_id) || { username: 'უცნობი', avatar_url: null },
            } : null,
          };
        });
      }

      // SET ALL STATE AT ONCE - no staggered loading
      setPosts(mappedPosts);
      setPinnedPost(mappedPinnedPost);
      setPinnedPoll(pinnedPollData);
      setPolls(pollsData);
      setActivities(mappedActivities);
      // reels removed
      setVideos(mappedVideos);
      setMovies(mappedMovies);
      setFeedShares(mappedShares);
      setLoading(false);

      // Cache for instant display on next page load
      setFeedCache({
        posts: mappedPosts,
        pinnedPost: mappedPinnedPost,
        polls: pollsData,
        activities: mappedActivities,
        videos: mappedVideos,
      });

    } catch (err: any) {
      console.error('Error fetching feed:', err);
      setPosts([]);
      setLoading(false);
    }
  }, [user]);

  // Fetch posts only once on mount - no dependencies that change frequently
  useEffect(() => {
    fetchPosts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Separate realtime subscription - debounced to prevent refresh storms
  useEffect(() => {
    if (!user) return;
    
    let debounceTimer: NodeJS.Timeout | null = null;
    let lastFetchTime = Date.now();
    const MIN_FETCH_INTERVAL = 30000; // 30 seconds minimum between realtime fetches
    
    const channel = supabase
      .channel(`feed-posts-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        () => {
          // Debounce and throttle realtime updates
          const now = Date.now();
          if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
            // Too soon, skip this update
            return;
          }
          
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            lastFetchTime = Date.now();
            fetchPosts();
          }, 5000); // Wait 5 seconds before fetching
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        (payload: any) => {
          // If post is unapproved/rejected, remove it from feed immediately
          if (payload.new && payload.new.is_approved === false) {
            setPosts(prev => prev.filter(p => p.id !== payload.new.id));
          }
          // If post is approved, it will show up on next fetch
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload: any) => {
          // Remove deleted post from feed immediately
          if (payload.old?.id) {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // Only depend on user.id, not the full user object

  // Scroll to specific post when scrollToPostId is provided
  useEffect(() => {
    if (scrollToPostId && !loading && posts.length > 0) {
      setTimeout(() => {
        const postElement = document.getElementById(`post-${scrollToPostId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          postElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
          setTimeout(() => {
            postElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
          }, 3000);
        }
        if (onScrollToPostComplete) {
          onScrollToPostComplete();
        }
      }, 500);
    }
  }, [scrollToPostId, loading, posts.length, onScrollToPostComplete]);

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({ title: 'შედით სისტემაში', variant: 'destructive' });
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Skip like for group posts (they use a different system)
    if (postId.startsWith('group-')) {
      toast({ title: 'ჯგუფის პოსტებზე like შეუძლებელია ამ ხედიდან' });
      return;
    }

    const isLiked = post.is_liked;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) }
        : p
    ));

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        
        // Create notification for post owner (if not self)
        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'like',
            from_user_id: user.id,
            post_id: postId,
          });
        }
      }
      onPostInteraction?.('like', postId);
    } catch (error) {
      // Revert on error
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_liked: isLiked, likes_count: p.likes_count + (isLiked ? 1 : -1) }
          : p
      ));
    }
  };

  const handleComment = async (postId: string, comment: string) => {
    if (!user) {
      toast({ title: 'შედით სისტემაში', variant: 'destructive' });
      return;
    }

    // Skip comment for group posts (they use a different system)
    if (postId.startsWith('group-')) {
      toast({ title: 'ჯგუფის პოსტებზე კომენტარი შეუძლებელია ამ ხედიდან' });
      return;
    }

    const post = posts.find(p => p.id === postId);
    
    try {
      await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: user.id, content: comment });

      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, comments_count: p.comments_count + 1 }
          : p
      ));

      // Create notification for post owner (if not self)
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'comment',
          from_user_id: user.id,
          post_id: postId,
        });
      }

      toast({ title: 'კომენტარი დაემატა' });
      onPostInteraction?.('comment', postId);
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast({
      title: 'ბმული დაკოპირდა',
      description: 'პოსტის ბმული დაკოპირდა ბუფერში',
    });
    onPostInteraction?.('share', postId);
  };

  const handleBookmark = async (postId: string) => {
    if (!user) {
      toast({ title: 'შედით სისტემაში', variant: 'destructive' });
      return;
    }

    // Skip bookmark for group posts (they use a different system)
    if (postId.startsWith('group-')) {
      toast({ title: 'ჯგუფის პოსტებზე bookmark შეუძლებელია ამ ხედიდან' });
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isBookmarked = post.is_bookmarked;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, is_bookmarked: !isBookmarked } : p
    ));

    try {
      if (isBookmarked) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        toast({ title: 'წაიშალა შენახულებიდან' });
      } else {
        await supabase
          .from('saved_posts')
          .insert({ post_id: postId, user_id: user.id });
        toast({ title: 'შენახულია' });
      }
      onPostInteraction?.('bookmark', postId);
    } catch (error) {
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, is_bookmarked: isBookmarked } : p
      ));
    }
  };

  const handleDelete = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    // Also clear pinned post if it was deleted
    if (pinnedPost?.id === postId) {
      setPinnedPost(null);
    }
  };

  // Handle pin toggle - refresh to get updated data
  const handlePinToggle = useCallback(async () => {
    // Refresh posts to get updated pin state
    await fetchPosts();
  }, [fetchPosts]);

  // Handle poll pin toggle
  const handlePollPinToggle = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  const handlePollDelete = (pollId: string) => {
    setPolls(prev => prev.filter(p => p.id !== pollId));
  };

  const handleActivityDelete = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
  };

  // Reels removed

  // Memoize can delete check
  const canDeletePosts = useMemo(() => {
    return ['super_admin', 'admin', 'moderator'].includes(userRole || '');
  }, [userRole]);

  // Live streaming removed

  // Combine posts, polls, activities, reels, videos and shares for mixed feed, sorted by created_at
  // Filter out posts if the same image already exists as album_photo activity (keep activity, remove post)
  const feedItems = useMemo(() => {
    const items: { type: 'post' | 'poll' | 'activity' | 'reel' | 'video' | 'movie' | 'share'; id: string; created_at: string; data: any }[] = [];
    
    // Collect all album_photo activity image URLs - these are the "new module" that shows full photos
    const albumPhotoUrls = new Set(
      activities
        .filter(a => a.activity_type === 'album_photo' && a.image_url)
        .map(a => a.image_url)
    );
    
    // Filter posts - skip those that have duplicate images in album_photo activities
    posts.forEach(post => {
      // Skip this post if its image already exists as an album_photo activity
      if (post.image_url && albumPhotoUrls.has(post.image_url)) {
        return; // Skip this duplicate post, keep the activity instead
      }
      items.push({ type: 'post', id: post.id, created_at: post.created_at, data: post });
    });
    
    polls.forEach(poll => {
      items.push({ type: 'poll', id: poll.id, created_at: poll.created_at, data: poll });
    });

    // Collect video IDs and URLs that already appear as video_share activities (to avoid duplicates)
    const videoShareVideoIds = new Set(
      activities
        .filter(a => a.activity_type === 'video_share' && (a as any).metadata?.video_id)
        .map(a => (a as any).metadata.video_id as string)
    );
    const videoShareUrls = new Set(
      activities
        .filter(a => a.activity_type === 'video_share' && (a as any).metadata?.video_url)
        .map(a => (a as any).metadata.video_url as string)
    );

    // Keep all activities (including album_photo which shows full photos)
    activities.forEach(activity => {
      items.push({ type: 'activity', id: activity.id, created_at: activity.created_at, data: activity });
    });

    // Reels removed

    // Add videos to feed — skip those already shown via video_share activity
    videos.forEach(video => {
      if (videoShareVideoIds.has(video.id)) return;
      if ((video as any).original_url && videoShareUrls.has((video as any).original_url)) return;
      items.push({ type: 'video', id: video.id, created_at: video.created_at, data: video });
    });

    // Add movies to feed (new movies appear in feed)
    movies.forEach(movie => {
      items.push({ type: 'movie', id: movie.id, created_at: movie.created_at, data: movie });
    });

    // Add feed shares (Facebook-style shared posts)
    feedShares.forEach(share => {
      items.push({ type: 'share', id: share.id, created_at: share.created_at, data: share });
    });
    
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts, polls, activities, videos, movies, feedShares]);

  const handleShareDelete = (shareId: string) => {
    setFeedShares(prev => prev.filter(s => s.id !== shareId));
  };

  const handleVideoDelete = (videoId: string) => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
  };

  if (loading) {
    return <FeedSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <button 
          onClick={fetchPosts}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          თავიდან ცდა
        </button>
      </div>
    );
  }

  if (feedItems.length === 0 && !pinnedPost) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">ჯერ არ არის პოსტები</p>
        <p className="text-sm text-muted-foreground mt-2">შექმენი პირველი პოსტი!</p>
      </div>
    );
  }

  // Helper function to render a post card
  const renderPostCard = (post: PostWithDetails, isPinned = false) => {

    return (
      <div id={`post-${post.id}`}>
        <PostCard
          post={{
            id: post.id,
            author: {
              id: post.user_id,
              name: post.profile?.username || 'უცნობი',
              avatar: post.profile?.avatar_url || '',
              isVerified: false,
              gender: post.profile?.gender,
            },
            content: post.content || undefined,
            image: post.image_url || undefined,
            video: post.video_url || undefined,
            likes: post.likes_count,
            comments: post.comments_count,
            shares: 0,
            isLiked: post.is_liked,
            isBookmarked: post.is_bookmarked,
            createdAt: new Date(post.created_at),
            groupId: post.group_id,
            groupName: post.group_name,
            groupCoverUrl: post.group_cover_url,
            isGroupMember: post.is_group_member,
            locationName: post.location_name,
            locationFull: post.location_full,
            locationLat: post.location_lat,
            locationLng: post.location_lng,
            locationSource: post.location_source as 'manual' | 'gps' | 'provider' | undefined,
            isGloballyPinned: isPinned || post.is_globally_pinned,
            globallyPinnedAt: post.globally_pinned_at ? new Date(post.globally_pinned_at) : undefined,
            moodEmoji: post.mood_emoji || undefined,
            moodText: post.mood_text || undefined,
            moodType: (post.mood_type as 'feeling' | 'activity') || undefined,
          }}
          canDeleteFromParent={canDeletePosts}
          onComment={post.group_id ? undefined : handleComment}
          onShare={handleShare}
          onBookmark={post.group_id ? undefined : handleBookmark}
          onUserClick={onUserClick}
          onDelete={post.group_id ? undefined : handleDelete}
          onGroupClick={onGroupClick}
          onHashtagClick={onHashtagClick}
          prefetchedStyleData={userStylesMap.get(post.user_id) || null}
          isSuperAdmin={isSuperAdmin}
          onPinToggle={handlePinToggle}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 pb-24 lg:pb-4 w-full max-w-full overflow-x-hidden px-2 sm:px-0">
      {/* Live streaming removed */}
      
      {/* GLOBALLY PINNED POST - Always first */}
      {pinnedPost && (
        <div key={`pinned-${pinnedPost.id}`}>
          {renderPostCard(pinnedPost, true)}
        </div>
      )}

      {/* GLOBALLY PINNED POLL - Right after pinned post */}
      {pinnedPoll && (
        <div key={`pinned-poll-${pinnedPoll.id}`} className="ring-1 ring-primary/30 rounded-xl">
          <PollFeedItem
            pollId={pinnedPoll.id}
            onUserClick={onUserClick}
            onDelete={handlePollDelete}
            isSuperAdmin={isSuperAdmin}
            onPinToggle={handlePollPinToggle}
          />
        </div>
      )}
      
      {feedItems.slice(0, INITIAL_ITEMS_TO_SHOW).map((item, index) => {
        // Insert SuggestedFriends after the 2nd item (between 2nd and 3rd)
        const showSuggestedFriends = index === 2;
        
        const renderItem = () => {
          if (item.type === 'poll') {
            return (
              <PollFeedItem 
                key={`poll-${item.id}`}
                pollId={item.id} 
                onUserClick={onUserClick}
                onDelete={handlePollDelete}
                isSuperAdmin={isSuperAdmin}
                onPinToggle={handlePollPinToggle}
              />
            );
          }

          if (item.type === 'activity') {
            const activity = item.data as ActivityData;
            return (
              <ActivityCard
                key={`activity-${activity.id}`}
                activity={activity}
                onUserClick={onUserClick}
                onDelete={handleActivityDelete}
                canDelete={canDeletePosts}
                likesCount={activity.likes_count}
                commentsCount={activity.comments_count}
                isLiked={activity.is_liked}
              />
            );
          }

          // Reels removed

          if (item.type === 'video') {
            const video = item.data as VideoData;
            return (
              <VideoFeedCard
                key={`video-${video.id}`}
                video={video}
                onUserClick={onUserClick}
                onDelete={handleVideoDelete}
                canDelete={canDeletePosts}
              />
            );
          }

          if (item.type === 'movie') {
            return (
              <MovieFeedCard
                key={`movie-${item.id}`}
                movie={item.data}
                onUserClick={onUserClick}
              />
            );
          }

          if (item.type === 'share') {
            return (
              <ShareFeedCard
                key={`share-${item.id}`}
                share={item.data}
                onUserClick={onUserClick}
                onDelete={handleShareDelete}
                canDelete={canDeletePosts}
              />
            );
          }
          
          const post = item.data as PostWithDetails;
          return renderPostCard(post);
        };

        return (
          <div 
            key={`feed-item-${item.id}`} 
            className="animate-fade-in"
            style={{ 
              contentVisibility: 'auto', 
              containIntrinsicSize: 'auto 400px',
              animationDelay: `${Math.min(index * 60, 300)}ms`,
              animationFillMode: 'both'
            }}
          >
            {showSuggestedFriends && (
              <div className="mb-1 sm:mb-3">
                <SuggestedFriends onUserClick={onUserClick} />
              </div>
            )}
            {renderItem()}
          </div>
        );
      })}

      {/* Load remaining items after initial render */}
      {feedItems.length > INITIAL_ITEMS_TO_SHOW && (
        <>
          {feedItems.slice(INITIAL_ITEMS_TO_SHOW).map((item) => {
            if (item.type === 'poll') {
              return (
                <PollFeedItem 
                  key={`poll-${item.id}`}
                  pollId={item.id} 
                  onUserClick={onUserClick}
                  onDelete={handlePollDelete}
                />
              );
            }

            if (item.type === 'activity') {
              const activity = item.data as ActivityData;
              return (
                <ActivityCard
                  key={`activity-${activity.id}`}
                  activity={activity}
                  onUserClick={onUserClick}
                  onDelete={handleActivityDelete}
                  canDelete={canDeletePosts}
                  likesCount={activity.likes_count}
                  commentsCount={activity.comments_count}
                  isLiked={activity.is_liked}
                />
              );
            }

            // Reels removed

            if (item.type === 'video') {
              const video = item.data as VideoData;
              return (
                <VideoFeedCard
                  key={`video-${video.id}`}
                  video={video}
                  onUserClick={onUserClick}
                  onDelete={handleVideoDelete}
                  canDelete={canDeletePosts}
                />
              );
            }

            if (item.type === 'movie') {
              return (
                <MovieFeedCard
                  key={`movie-${item.id}`}
                  movie={item.data}
                  onUserClick={onUserClick}
                />
              );
            }

            if (item.type === 'share') {
              return (
                <ShareFeedCard
                  key={`share-${item.id}`}
                  share={item.data}
                  onUserClick={onUserClick}
                  onDelete={handleShareDelete}
                  canDelete={canDeletePosts}
                />
              );
            }
            
            const post = item.data as PostWithDetails;
            return renderPostCard(post);
          })}
        </>
      )}

      {/* Reels removed */}
    </div>
  );
}));

Feed.displayName = 'Feed';

export default Feed;