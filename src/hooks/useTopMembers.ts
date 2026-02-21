import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TopMember {
  user_id: string;
  username: string;
  avatar_url: string | null;
  gender: string;
  points: number;
}

// Global cache for top members to prevent duplicate fetches
let globalTopMembersCache: {
  members: TopMember[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 300000; // 5 minutes cache - longer cache for less frequent updates
const FETCH_TIMEOUT = 6000; // 6 seconds timeout

let isFetching = false;
let fetchPromise: Promise<TopMember[]> | null = null;

export const useTopMembers = (limit: number = 5) => {
  const [topMembers, setTopMembers] = useState<TopMember[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchTopMembers = async (): Promise<TopMember[]> => {
    const now = Date.now();
    
    // Return cached data if valid
    if (globalTopMembersCache && (now - globalTopMembersCache.timestamp) < CACHE_DURATION) {
      return globalTopMembersCache.members;
    }

    // Wait for existing fetch if in progress
    if (isFetching && fetchPromise) {
      return fetchPromise;
    }

    isFetching = true;

    fetchPromise = (async () => {
      try {
        // Create timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        // OPTIMIZED: Use a single aggregated query approach
        // Instead of N queries per user, fetch aggregated data
        
        // 1. Get profiles - reduced limit for faster load
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender')
          .eq('is_approved', true)
          .eq('is_site_banned', false)
          .limit(50); // Reduced from 100 for faster load

        clearTimeout(timeoutId);

        if (profilesError || !profiles || profiles.length === 0) {
          globalTopMembersCache = { members: [], timestamp: now };
          return [];
        }

        const userIds = profiles.map(p => p.user_id);

        // 2. Batch fetch all counts in parallel (single query each)
        const [postsData, likesData, commentsData, followersData, storiesData] = await Promise.all([
          // Posts per user
          supabase.from('posts').select('user_id').in('user_id', userIds),
          // User's post IDs for likes/comments - we need a different approach
          supabase.from('posts').select('id, user_id').in('user_id', userIds),
          // Will process after getting post IDs
          Promise.resolve({ data: null }),
          // Followers per user
          supabase.from('followers').select('following_id').in('following_id', userIds),
          // Stories per user
          supabase.from('stories').select('user_id').in('user_id', userIds)
        ]);

        // Build count maps
        const postsCountMap = new Map<string, number>();
        postsData.data?.forEach(p => {
          postsCountMap.set(p.user_id, (postsCountMap.get(p.user_id) || 0) + 1);
        });

        const followersCountMap = new Map<string, number>();
        followersData.data?.forEach(f => {
          followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
        });

        const storiesCountMap = new Map<string, number>();
        storiesData.data?.forEach(s => {
          storiesCountMap.set(s.user_id, (storiesCountMap.get(s.user_id) || 0) + 1);
        });

        // Map post IDs to user IDs
        const postToUserMap = new Map<string, string>();
        const postIds: string[] = [];
        likesData.data?.forEach(p => {
          postToUserMap.set(p.id, p.user_id);
          postIds.push(p.id);
        });

        // Now fetch likes and comments for all posts
        let likesCountMap = new Map<string, number>();
        let commentsCountMap = new Map<string, number>();

        if (postIds.length > 0) {
          const [allLikes, allComments] = await Promise.all([
            supabase.from('post_likes').select('post_id').in('post_id', postIds.slice(0, 500)),
            supabase.from('post_comments').select('post_id').in('post_id', postIds.slice(0, 500))
          ]);

          // Aggregate likes by user
          allLikes.data?.forEach(like => {
            const userId = postToUserMap.get(like.post_id);
            if (userId) {
              likesCountMap.set(userId, (likesCountMap.get(userId) || 0) + 1);
            }
          });

          // Aggregate comments by user
          allComments.data?.forEach(comment => {
            const userId = postToUserMap.get(comment.post_id);
            if (userId) {
              commentsCountMap.set(userId, (commentsCountMap.get(userId) || 0) + 1);
            }
          });
        }

        // Calculate points for each user
        const usersWithPoints: TopMember[] = profiles.map(profile => {
          const points = 
            (postsCountMap.get(profile.user_id) || 0) * 10 +
            (likesCountMap.get(profile.user_id) || 0) * 2 +
            (commentsCountMap.get(profile.user_id) || 0) * 5 +
            (followersCountMap.get(profile.user_id) || 0) * 3 +
            (storiesCountMap.get(profile.user_id) || 0) * 5;

          return {
            user_id: profile.user_id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            gender: profile.gender || 'male',
            points,
          };
        });

        // Sort by points descending
        const topUsers = usersWithPoints
          .sort((a, b) => b.points - a.points)
          .slice(0, 20); // Cache top 20

        globalTopMembersCache = { members: topUsers, timestamp: now };
        return topUsers;

      } catch (error) {
        console.warn('Error fetching top members:', error);
        // Return cached data on error, or empty array
        return globalTopMembersCache?.members || [];
      } finally {
        isFetching = false;
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  };

  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      try {
        const members = await fetchTopMembers();
        if (mountedRef.current) {
          setTopMembers(members.slice(0, limit));
          setLoading(false);
        }
      } catch (e) {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    load();

    // Refresh every 2 minutes - no realtime subscriptions to reduce load
    const interval = setInterval(() => {
      globalTopMembersCache = null; // Invalidate cache
      load();
    }, CACHE_DURATION);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [limit]);

  const refetch = async () => {
    globalTopMembersCache = null;
    setLoading(true);
    const members = await fetchTopMembers();
    if (mountedRef.current) {
      setTopMembers(members.slice(0, limit));
      setLoading(false);
    }
  };

  return { topMembers, loading, refetch };
};
