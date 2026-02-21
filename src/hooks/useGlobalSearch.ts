import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SearchCategory = 
  | 'all' 
  | 'users' 
  | 'groups' 
  | 'posts' 
  | 'blogs' 
  | 'videos' 
  | 'music' 
  | 'polls' 
  | 'events';

export type SortOption = 'relevance' | 'newest' | 'popular';

export interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  userId?: string;
  isOnline?: boolean;
  memberCount?: number;
  viewCount?: number;
  likeCount?: number;
  createdAt?: string;
  score: number;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  category: SearchCategory;
  sort: SortOption;
  hasMore: boolean;
  page: number;
}

const ITEMS_PER_PAGE = 20;

export function useGlobalSearch() {
  const { user } = useAuth();
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    category: 'all',
    sort: 'relevance',
    hasMore: false,
    page: 0,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchUsers = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, age, city, online_visible_until')
      .or(`username.ilike.${searchTerm}`)
      .limit(limit);
    
    if (error) throw error;
    
    // Fetch invisible users - they should appear OFFLINE
    const userIds = data?.map(u => u.user_id) || [];
    const { data: invisibleData } = await supabase
      .from('privacy_settings')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_invisible', true);
    
    const invisibleSet = new Set(invisibleData?.map(u => u.user_id) || []);
    
    return (data || []).map(u => ({
      id: u.user_id,
      type: 'users' as SearchCategory,
      title: u.username || 'Unknown',
      subtitle: u.city || undefined,
      description: u.age ? `${u.age} წლის` : undefined,
      imageUrl: u.avatar_url || undefined,
      userId: u.user_id,
      // If invisible, show as offline
      isOnline: invisibleSet.has(u.user_id) ? false : (u.online_visible_until ? new Date(u.online_visible_until) > new Date() : false),
      score: u.username?.toLowerCase() === query.toLowerCase() ? 100 : 
             u.username?.toLowerCase().startsWith(query.toLowerCase()) ? 80 : 50,
      createdAt: undefined,
    }));
  }, []);

  // Groups search removed - groups module deleted
  const searchGroups = useCallback(async (_query: string, _limit: number): Promise<SearchResult[]> => {
    return [];
  }, []);

  const searchPosts = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, content, image_url, video_url, user_id, created_at, is_approved')
      .ilike('content', searchTerm)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    // Get usernames
    const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    // Get like counts
    const postIds = posts?.map(p => p.id) || [];
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds);
    
    const likeMap = new Map<string, number>();
    likes?.forEach(l => {
      likeMap.set(l.post_id, (likeMap.get(l.post_id) || 0) + 1);
    });
    
    return (posts || []).map(p => {
      const profile = profileMap.get(p.user_id);
      return {
        id: p.id,
        type: 'posts' as SearchCategory,
        title: p.content?.slice(0, 100) || 'პოსტი',
        subtitle: profile?.username || 'უცნობი',
        imageUrl: p.image_url || undefined,
        userId: p.user_id,
        likeCount: likeMap.get(p.id) || 0,
        score: 40,
        createdAt: p.created_at,
      };
    });
  }, []);

  const searchBlogs = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, excerpt, content, cover_url, user_id, views_count, created_at, status')
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},excerpt.ilike.${searchTerm}`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const userIds = [...new Set(data?.map(b => b.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
    
    return (data || []).map(b => ({
      id: b.id,
      type: 'blogs' as SearchCategory,
      title: b.title,
      subtitle: profileMap.get(b.user_id) || 'უცნობი',
      description: b.excerpt || b.content?.slice(0, 150) || undefined,
      imageUrl: b.cover_url || undefined,
      viewCount: b.views_count || 0,
      score: b.title.toLowerCase().includes(query.toLowerCase()) ? 70 : 40,
      createdAt: b.created_at,
    }));
  }, []);

  const searchVideos = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('videos')
      .select('id, title, description, thumbnail_url, user_id, views_count, created_at')
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const userIds = [...new Set(data?.map(v => v.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
    
    return (data || []).map(v => ({
      id: v.id,
      type: 'videos' as SearchCategory,
      title: v.title || 'ვიდეო',
      subtitle: profileMap.get(v.user_id) || 'უცნობი',
      description: v.description || undefined,
      imageUrl: v.thumbnail_url || undefined,
      viewCount: v.views_count || 0,
      score: v.title?.toLowerCase().includes(query.toLowerCase()) ? 70 : 40,
      createdAt: v.created_at,
    }));
  }, []);

  const searchMusic = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('music')
      .select('id, title, artist, album, cover_url, plays, created_at, status')
      .or(`title.ilike.${searchTerm},artist.ilike.${searchTerm},album.ilike.${searchTerm}`)
      .eq('status', 'approved')
      .order('plays', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return (data || []).map(m => ({
      id: m.id,
      type: 'music' as SearchCategory,
      title: m.title || 'უცნობი',
      subtitle: m.artist || 'უცნობი არტისტი',
      description: m.album || undefined,
      imageUrl: m.cover_url || undefined,
      viewCount: m.plays || 0,
      score: m.title?.toLowerCase().includes(query.toLowerCase()) ? 80 : 50,
      createdAt: m.created_at,
    }));
  }, []);

  const searchPolls = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('polls')
      .select('id, title, question, user_id, created_at, status')
      .or(`title.ilike.${searchTerm},question.ilike.${searchTerm}`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const userIds = [...new Set(data?.map(p => p.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
    
    return (data || []).map(p => ({
      id: p.id,
      type: 'polls' as SearchCategory,
      title: p.title || p.question || 'გამოკითხვა',
      subtitle: profileMap.get(p.user_id) || 'უცნობი',
      description: p.question || undefined,
      score: 40,
      createdAt: p.created_at,
    }));
  }, []);

  // Events search removed - groups module deleted
  const searchEvents = useCallback(async (_query: string, _limit: number): Promise<SearchResult[]> => {
    return [];
  }, []);

  const performSearch = useCallback(async (
    query: string, 
    category: SearchCategory = 'all',
    sort: SortOption = 'relevance',
    page: number = 0
  ) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], loading: false }));
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, query, category, sort, page }));

    try {
      const limit = category === 'all' ? 5 : ITEMS_PER_PAGE;
      const offset = page * ITEMS_PER_PAGE;
      
      let allResults: SearchResult[] = [];

      if (category === 'all') {
        // Parallel search all categories
        const [users, groups, posts, blogs, videos, music, polls, events] = await Promise.all([
          searchUsers(query, limit).catch(() => []),
          searchGroups(query, limit).catch(() => []),
          searchPosts(query, limit).catch(() => []),
          searchBlogs(query, limit).catch(() => []),
          searchVideos(query, limit).catch(() => []),
          searchMusic(query, limit).catch(() => []),
          searchPolls(query, limit).catch(() => []),
          searchEvents(query, limit).catch(() => []),
        ]);
        
        allResults = [...users, ...groups, ...posts, ...blogs, ...videos, ...music, ...polls, ...events];
      } else {
        switch (category) {
          case 'users':
            allResults = await searchUsers(query, ITEMS_PER_PAGE);
            break;
          case 'groups':
            allResults = await searchGroups(query, ITEMS_PER_PAGE);
            break;
          case 'posts':
            allResults = await searchPosts(query, ITEMS_PER_PAGE);
            break;
          case 'blogs':
            allResults = await searchBlogs(query, ITEMS_PER_PAGE);
            break;
          case 'videos':
            allResults = await searchVideos(query, ITEMS_PER_PAGE);
            break;
          case 'music':
            allResults = await searchMusic(query, ITEMS_PER_PAGE);
            break;
          case 'polls':
            allResults = await searchPolls(query, ITEMS_PER_PAGE);
            break;
          case 'events':
            allResults = await searchEvents(query, ITEMS_PER_PAGE);
            break;
        }
      }

      // Sort results
      if (sort === 'relevance') {
        allResults.sort((a, b) => b.score - a.score);
      } else if (sort === 'newest') {
        allResults.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sort === 'popular') {
        allResults.sort((a, b) => (b.viewCount || b.likeCount || 0) - (a.viewCount || a.likeCount || 0));
      }

      setState(prev => ({
        ...prev,
        results: page === 0 ? allResults : [...prev.results, ...allResults],
        loading: false,
        hasMore: allResults.length >= ITEMS_PER_PAGE,
      }));

      // Save to recent searches
      saveRecentSearch(query);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Search error:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [searchUsers, searchGroups, searchPosts, searchBlogs, searchVideos, searchMusic, searchPolls, searchEvents]);

  const clearSearch = useCallback(() => {
    setState({
      query: '',
      results: [],
      loading: false,
      category: 'all',
      sort: 'relevance',
      hasMore: false,
      page: 0,
    });
  }, []);

  const setCategory = useCallback((category: SearchCategory) => {
    setState(prev => ({ ...prev, category }));
    if (state.query) {
      performSearch(state.query, category, state.sort, 0);
    }
  }, [state.query, state.sort, performSearch]);

  const setSort = useCallback((sort: SortOption) => {
    setState(prev => ({ ...prev, sort }));
    if (state.query) {
      performSearch(state.query, state.category, sort, 0);
    }
  }, [state.query, state.category, performSearch]);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      performSearch(state.query, state.category, state.sort, state.page + 1);
    }
  }, [state, performSearch]);

  return {
    ...state,
    performSearch,
    clearSearch,
    setCategory,
    setSort,
    loadMore,
  };
}

// Recent searches management
const RECENT_SEARCHES_KEY = 'globalRecentSearches';
const MAX_RECENT_SEARCHES = 10;

export function getRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  try {
    const recent = getRecentSearches();
    const updated = [query, ...recent.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearRecentSearch(query: string): void {
  try {
    const recent = getRecentSearches();
    const updated = recent.filter(s => s !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearAllRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage errors
  }
}
