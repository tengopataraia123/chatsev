import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ActivityItem, ActivityFilter, ActivityType } from './types';

const PAGE_SIZE = 10;

interface ProfileData {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  gender: string | null;
}

export function useProfileActivity(profileUserId: string) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const pageRef = useRef(0);
  const isFriendRef = useRef(false);

  // Check friendship status
  useEffect(() => {
    const checkFriendship = async () => {
      if (!user || user.id === profileUserId) {
        isFriendRef.current = true; // Own profile, full access
        return;
      }

      const { data } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},addressee_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      isFriendRef.current = !!data;
    };

    checkFriendship();
  }, [user, profileUserId]);

  const fetchActivities = useCallback(async (page: number, append = false) => {
    if (!profileUserId) return;

    if (page === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const allActivities: ActivityItem[] = [];
      const offset = page * PAGE_SIZE;

      // Fetch author profile once
      const { data: authorProfileData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_verified, gender')
        .eq('user_id', profileUserId)
        .single();

      const authorProfile: ProfileData = authorProfileData || {
        user_id: profileUserId,
        username: 'მომხმარებელი',
        avatar_url: null,
        is_verified: false,
        gender: null
      };

      // 1. Fetch user posts
      if (filter === 'all' || filter === 'posts' || filter === 'photos' || filter === 'videos') {
        let postsQuery = supabase
          .from('posts')
          .select('id, content, image_url, video_url, created_at, user_id, is_approved, mood_emoji, mood_text')
          .eq('user_id', profileUserId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        // Apply filter
        if (filter === 'photos') {
          postsQuery = postsQuery.not('image_url', 'is', null);
        } else if (filter === 'videos') {
          postsQuery = postsQuery.not('video_url', 'is', null);
        }

        if (searchQuery) {
          postsQuery = postsQuery.ilike('content', `%${searchQuery}%`);
        }

        const { data: posts } = await postsQuery;

        if (posts && posts.length > 0) {
          const postIds = posts.map(p => p.id);
          
          // Fetch reaction counts using correct column names
          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('message_id')
            .eq('message_type', 'post')
            .in('message_id', postIds);

          const { data: comments } = await supabase
            .from('post_comments')
            .select('post_id')
            .in('post_id', postIds);

          const { data: shares } = await supabase
            .from('post_shares')
            .select('post_id')
            .in('post_id', postIds);

          // Get user's reactions
          let userReactionsSet = new Set<string>();
          if (user) {
            const { data: userReactions } = await supabase
              .from('message_reactions')
              .select('message_id')
              .eq('message_type', 'post')
              .eq('user_id', user.id)
              .in('message_id', postIds);
            userReactionsSet = new Set(userReactions?.map(r => r.message_id) || []);
          }

          const reactionsMap = new Map<string, number>();
          const commentsMap = new Map<string, number>();
          const sharesMap = new Map<string, number>();

          reactions?.forEach(r => reactionsMap.set(r.message_id, (reactionsMap.get(r.message_id) || 0) + 1));
          comments?.forEach(c => commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1));
          shares?.forEach(s => sharesMap.set(s.post_id, (sharesMap.get(s.post_id) || 0) + 1));

          for (const post of posts) {
            allActivities.push({
              id: post.id,
              type: 'post',
              actor: {
                id: authorProfile.user_id,
                username: authorProfile.username,
                avatar_url: authorProfile.avatar_url,
                is_verified: authorProfile.is_verified,
                gender: authorProfile.gender || undefined
              },
              target_user_id: profileUserId,
              created_at: new Date(post.created_at),
              privacy_level: 'public',
              content: post.content,
              image_url: post.image_url,
              video_url: post.video_url,
              likes_count: reactionsMap.get(post.id) || 0,
              comments_count: commentsMap.get(post.id) || 0,
              shares_count: sharesMap.get(post.id) || 0,
              is_liked: userReactionsSet.has(post.id),
              is_bookmarked: false,
              mood_emoji: (post as any).mood_emoji || null,
              mood_text: (post as any).mood_text || null,
            });
          }
        }
      }

      // Group posts section removed - groups module deleted

      // 3. Fetch user activities (profile photo, cover photo, module activities, etc.)
      if (filter === 'all') {
        const { data: userActivities } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (userActivities && userActivities.length > 0) {
          for (const activity of userActivities) {
            // Map activity_type to our ActivityType
            let activityType: ActivityType = 'post';
            switch (activity.activity_type) {
              case 'avatar':
              case 'profile_photo':
                activityType = 'profile_photo';
                break;
              case 'cover':
              case 'cover_photo':
                activityType = 'cover_photo';
                break;
              case 'album_photo':
                activityType = 'album_photo';
                break;
              case 'video':
                activityType = 'video';
                break;
              // Module activity types
              case 'workout':
                activityType = 'workout';
                break;
              case 'mood_entry':
                activityType = 'mood_entry';
                break;
              case 'confession':
                activityType = 'confession';
                break;
              case 'ai_avatar':
                activityType = 'ai_avatar';
                break;
              case 'qa_answer':
                activityType = 'qa_answer';
                break;
              case 'horoscope_share':
                activityType = 'horoscope_share';
                break;
              case 'daily_fact_like':
                activityType = 'daily_fact_like';
                break;
              case 'job_post':
                activityType = 'job_post';
                break;
              case 'music_share':
                activityType = 'music_share';
                break;
              case 'memory_share':
                activityType = 'memory_share';
                break;
              case 'challenge_join':
                activityType = 'challenge_join';
                break;
              case 'blog_post':
                activityType = 'blog_post';
                break;
              default:
                activityType = 'post';
            }

            allActivities.push({
              id: activity.id,
              type: activityType,
              actor: {
                id: authorProfile.user_id,
                username: authorProfile.username,
                avatar_url: authorProfile.avatar_url,
                is_verified: authorProfile.is_verified,
                gender: authorProfile.gender || undefined
              },
              target_user_id: profileUserId,
              created_at: new Date(activity.created_at),
              privacy_level: 'public',
              activity_description: activity.description,
              image_url: activity.image_url,
              likes_count: 0,
              comments_count: 0,
              shares_count: 0,
              is_liked: false,
              is_bookmarked: false
            });
          }
        }
      }

      // 4. Fetch shares
      if (filter === 'all' || filter === 'shares') {
        const { data: shareData } = await supabase
          .from('post_shares')
          .select('id, created_at, destination, post_id, share_text')
          .eq('user_id', profileUserId)
          .eq('destination', 'feed')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (shareData && shareData.length > 0) {
          // Fetch original posts
          const postIds = shareData.map(s => s.post_id);
          const { data: originalPosts } = await supabase
            .from('posts')
            .select('id, content, image_url, video_url, created_at, user_id')
            .in('id', postIds);

          const postsMap = new Map((originalPosts || []).map(p => [p.id, p]));

          // Fetch original post authors
          const originalAuthorIds = [...new Set((originalPosts || []).map(p => p.user_id))];
          let originalAuthorsMap = new Map<string, ProfileData>();

          if (originalAuthorIds.length > 0) {
            const { data: originalAuthors } = await supabase
              .from('profiles')
              .select('user_id, username, avatar_url, is_verified, gender')
              .in('user_id', originalAuthorIds);

            (originalAuthors || []).forEach(a => {
              originalAuthorsMap.set(a.user_id, {
                user_id: a.user_id,
                username: a.username,
                avatar_url: a.avatar_url,
                is_verified: a.is_verified || false,
                gender: a.gender
              });
            });
          }

          for (const share of shareData) {
            const originalPost = postsMap.get(share.post_id);
            const originalAuthor = originalPost ? originalAuthorsMap.get(originalPost.user_id) : null;

            allActivities.push({
              id: share.id,
              type: 'share',
              actor: {
                id: authorProfile.user_id,
                username: authorProfile.username,
                avatar_url: authorProfile.avatar_url,
                is_verified: authorProfile.is_verified,
                gender: authorProfile.gender || undefined
              },
              target_user_id: profileUserId,
              created_at: new Date(share.created_at),
              privacy_level: 'public',
              share_caption: (share as any).share_text || null,
              original_post: originalPost ? {
                id: originalPost.id,
                content: originalPost.content,
                image_url: originalPost.image_url,
                video_url: originalPost.video_url,
                author: {
                  id: originalAuthor?.user_id || originalPost.user_id,
                  username: originalAuthor?.username || 'მომხმარებელი',
                  avatar_url: originalAuthor?.avatar_url || null,
                  is_verified: originalAuthor?.is_verified,
                  gender: originalAuthor?.gender || undefined
                },
                created_at: originalPost.created_at,
                is_deleted: false
              } : {
                id: share.post_id,
                content: null,
                image_url: null,
                video_url: null,
                author: { id: '', username: 'მომხმარებელი', avatar_url: null },
                created_at: share.created_at,
                is_deleted: true
              },
              likes_count: 0,
              comments_count: 0,
              shares_count: 0,
              is_liked: false,
              is_bookmarked: false
            });
          }
        }
      }

      // Sort all activities by date
      allActivities.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      // Take only PAGE_SIZE items
      const finalActivities = allActivities.slice(0, PAGE_SIZE);
      
      setHasMore(finalActivities.length === PAGE_SIZE);

      if (append) {
        setActivities(prev => [...prev, ...finalActivities]);
      } else {
        setActivities(finalActivities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [profileUserId, user, filter, searchQuery]);

  // Initial fetch
  useEffect(() => {
    pageRef.current = 0;
    fetchActivities(0, false);
  }, [fetchActivities]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      pageRef.current += 1;
      fetchActivities(pageRef.current, true);
    }
  }, [fetchActivities, loadingMore, hasMore]);

  // Change filter
  const changeFilter = useCallback((newFilter: ActivityFilter) => {
    setFilter(newFilter);
    pageRef.current = 0;
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    pageRef.current = 0;
    fetchActivities(0, false);
  }, [fetchActivities]);

  return {
    activities,
    loading,
    loadingMore,
    hasMore,
    filter,
    searchQuery,
    setSearchQuery,
    changeFilter,
    loadMore,
    refresh
  };
}
