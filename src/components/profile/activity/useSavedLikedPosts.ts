import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ActivityItem } from './types';

const PAGE_SIZE = 20;

interface SavedPostData {
  id: string;
  post_id: string;
  created_at: string;
  post?: {
    id: string;
    content: string | null;
    image_url: string | null;
    video_url: string | null;
    created_at: string;
    user_id: string;
    is_approved: boolean;
  };
}

export function useSavedPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  const fetchPosts = useCallback(async (page: number, append = false) => {
    if (!user) return;

    if (page === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = page * PAGE_SIZE;

      const { data: savedData, error } = await supabase
        .from('saved_posts')
        .select('id, post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (!savedData || savedData.length === 0) {
        setHasMore(false);
        if (!append) setPosts([]);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // Fetch actual posts
      const postIds = savedData.map(s => s.post_id);
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, image_url, video_url, created_at, user_id, is_approved')
        .in('id', postIds);

      const postsMap = new Map((postsData || []).map(p => [p.id, p]));

      // Fetch authors
      const authorIds = [...new Set((postsData || []).map(p => p.user_id))];
      const { data: authors } = authorIds.length > 0
        ? await supabase.from('profiles').select('user_id, username, avatar_url, is_verified, gender').in('user_id', authorIds)
        : { data: [] };

      const authorsMap = new Map((authors || []).map(a => [a.user_id, a]));

      const activities: ActivityItem[] = [];

      for (const saved of savedData) {
        const post = postsMap.get(saved.post_id);
        if (!post || !post.is_approved) continue;

        const author = authorsMap.get(post.user_id);

        activities.push({
          id: post.id,
          type: 'post',
          actor: {
            id: author?.user_id || post.user_id,
            username: author?.username || 'მომხმარებელი',
            avatar_url: author?.avatar_url || null,
            is_verified: author?.is_verified,
            gender: author?.gender || undefined
          },
          target_user_id: post.user_id,
          created_at: new Date(post.created_at),
          privacy_level: 'public',
          content: post.content,
          image_url: post.image_url,
          video_url: post.video_url,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          is_liked: false,
          is_bookmarked: true
        });
      }

      setHasMore(savedData.length === PAGE_SIZE);

      if (append) {
        setPosts(prev => [...prev, ...activities]);
      } else {
        setPosts(activities);
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    pageRef.current = 0;
    fetchPosts(0, false);
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      pageRef.current += 1;
      fetchPosts(pageRef.current, true);
    }
  }, [fetchPosts, loadingMore, hasMore]);

  const refresh = useCallback(() => {
    pageRef.current = 0;
    fetchPosts(0, false);
  }, [fetchPosts]);

  const unsave = useCallback(async (postId: string) => {
    if (!user) return;
    
    // Skip for group posts - they use a different ID format
    if (postId.startsWith('group-')) {
      console.log('[useSavedPosts] Skipping unsave for group post');
      return;
    }

    await supabase
      .from('saved_posts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    setPosts(prev => prev.filter(p => p.id !== postId));
  }, [user]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    unsave
  };
}

export function useLikedPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  const fetchPosts = useCallback(async (page: number, append = false) => {
    if (!user) return;

    if (page === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = page * PAGE_SIZE;

      // Get liked posts (reactions)
      const { data: likedData, error } = await supabase
        .from('message_reactions')
        .select('message_id, created_at')
        .eq('user_id', user.id)
        .eq('message_type', 'post')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (!likedData || likedData.length === 0) {
        setHasMore(false);
        if (!append) setPosts([]);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // Fetch actual posts
      const postIds = likedData.map(l => l.message_id);
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, image_url, video_url, created_at, user_id, is_approved')
        .in('id', postIds);

      const postsMap = new Map((postsData || []).map(p => [p.id, p]));

      // Fetch authors
      const authorIds = [...new Set((postsData || []).map(p => p.user_id))];
      const { data: authors } = authorIds.length > 0
        ? await supabase.from('profiles').select('user_id, username, avatar_url, is_verified, gender').in('user_id', authorIds)
        : { data: [] };

      const authorsMap = new Map((authors || []).map(a => [a.user_id, a]));

      const activities: ActivityItem[] = [];

      for (const liked of likedData) {
        const post = postsMap.get(liked.message_id);
        if (!post || !post.is_approved) continue;

        const author = authorsMap.get(post.user_id);

        activities.push({
          id: post.id,
          type: 'post',
          actor: {
            id: author?.user_id || post.user_id,
            username: author?.username || 'მომხმარებელი',
            avatar_url: author?.avatar_url || null,
            is_verified: author?.is_verified,
            gender: author?.gender || undefined
          },
          target_user_id: post.user_id,
          created_at: new Date(post.created_at),
          privacy_level: 'public',
          content: post.content,
          image_url: post.image_url,
          video_url: post.video_url,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          is_liked: true,
          is_bookmarked: false
        });
      }

      setHasMore(likedData.length === PAGE_SIZE);

      if (append) {
        setPosts(prev => [...prev, ...activities]);
      } else {
        setPosts(activities);
      }
    } catch (error) {
      console.error('Error fetching liked posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    pageRef.current = 0;
    fetchPosts(0, false);
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      pageRef.current += 1;
      fetchPosts(pageRef.current, true);
    }
  }, [fetchPosts, loadingMore, hasMore]);

  const refresh = useCallback(() => {
    pageRef.current = 0;
    fetchPosts(0, false);
  }, [fetchPosts]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh
  };
}
