/**
 * AI Smart Search Hook - Universal Platform Search
 * Features: Fuzzy matching, intent understanding, smart ranking, privacy-aware
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SearchCategory = 
  | 'all' 
  | 'users' 
  | 'groups' 
  | 'posts' 
  | 'comments'
  | 'hashtags'
  | 'blogs' 
  | 'videos' 
  | 'music' 
  | 'polls' 
  | 'events'
  | 'live'
  | 'messages';

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
  isVerified?: boolean;
  memberCount?: number;
  viewCount?: number;
  likeCount?: number;
  createdAt?: string;
  score: number;
  matchedField?: string;
  highlightedText?: string;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  category: SearchCategory;
  sort: SortOption;
  hasMore: boolean;
  page: number;
  totalCount: number;
}

export interface TrendingItem {
  tag: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

const ITEMS_PER_PAGE = 20;

// Fuzzy matching utilities
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (s2.startsWith(s1)) return 90;
  if (s2.includes(s1)) return 75;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 0;
  
  const distance = levenshteinDistance(s1, s2);
  const similarity = (1 - distance / maxLen) * 100;
  
  // Boost for partial word matches
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  let wordMatchBonus = 0;
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w2.startsWith(w1) || w1.startsWith(w2)) {
        wordMatchBonus += 10;
      }
    }
  }
  
  return Math.min(100, similarity + wordMatchBonus);
}

// Highlight matched text
function highlightMatch(text: string, query: string): string {
  if (!text || !query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '**$1**');
}

// Extract hashtags from content
function extractHashtags(content: string): string[] {
  const matches = content.match(/#[\w\u10A0-\u10FF]+/g);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

export function useAISmartSearch() {
  const { user } = useAuth();
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    category: 'all',
    sort: 'relevance',
    hasMore: false,
    page: 0,
    totalCount: 0,
  });
  
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Search users with fuzzy matching and username history
  const searchUsers = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    
    // Search current usernames and cities
    const { data: users, error } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, age, city, online_visible_until, is_verified')
      .or(`username.ilike.${searchTerm},city.ilike.${searchTerm}`)
      .limit(limit);
    
    if (error) throw error;
    
    // Search username history for nickname variations
    const { data: historyUsers } = await supabase
      .from('username_history')
      .select('user_id, old_username, new_username')
      .or(`old_username.ilike.${searchTerm},new_username.ilike.${searchTerm}`)
      .limit(20);
    
    // Merge historical matches
    const historyUserIds = new Set(historyUsers?.map(h => h.user_id) || []);
    const existingUserIds = new Set(users?.map(u => u.user_id) || []);
    
    // Get profiles for history matches not in main results
    const missingIds = [...historyUserIds].filter(id => !existingUserIds.has(id));
    let additionalUsers: typeof users = [];
    
    if (missingIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, age, city, online_visible_until, is_verified')
        .in('user_id', missingIds);
      additionalUsers = data || [];
    }
    
    const allUsers = [...(users || []), ...additionalUsers];
    
    // Fetch invisible users
    const userIds = allUsers.map(u => u.user_id);
    const { data: invisibleData } = await supabase
      .from('privacy_settings')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_invisible', true);
    
    const invisibleSet = new Set(invisibleData?.map(u => u.user_id) || []);
    
    return allUsers.map(u => {
      const similarity = calculateSimilarity(query, u.username || '');
      const wasHistorical = historyUserIds.has(u.user_id);
      const cityMatch = u.city?.toLowerCase().includes(query.toLowerCase());
      
      return {
        id: u.user_id,
        type: 'users' as SearchCategory,
        title: u.username || 'Unknown',
        subtitle: u.city || undefined,
        description: u.age ? `${u.age} წლის` : undefined,
        imageUrl: u.avatar_url || undefined,
        userId: u.user_id,
        isOnline: invisibleSet.has(u.user_id) ? false : (u.online_visible_until ? new Date(u.online_visible_until) > new Date() : false),
        isVerified: u.is_verified || false,
        score: similarity + (cityMatch ? 10 : 0) + (wasHistorical ? 5 : 0) + (u.is_verified ? 15 : 0),
        matchedField: wasHistorical ? 'username_history' : (cityMatch ? 'city' : 'username'),
        highlightedText: highlightMatch(u.username || '', query),
        createdAt: undefined,
      };
    }).filter(u => u.score > 30); // Filter low matches
  }, []);

  // Groups search removed - groups module deleted
  const searchGroups = useCallback(async (_query: string, _limit: number): Promise<SearchResult[]> => {
    return [];
  }, []);

  // Search posts with hashtag support
  const searchPosts = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const isHashtagSearch = query.startsWith('#');
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, content, image_url, video_url, user_id, created_at, is_approved')
      .ilike('content', searchTerm)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
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
      const hashtags = extractHashtags(p.content || '');
      const hashtagMatch = isHashtagSearch && hashtags.includes(query.toLowerCase());
      const likeCount = likeMap.get(p.id) || 0;
      
      return {
        id: p.id,
        type: 'posts' as SearchCategory,
        title: p.content?.slice(0, 100) || 'პოსტი',
        subtitle: profile?.username || 'უცნობი',
        imageUrl: p.image_url || profile?.avatar_url || undefined,
        userId: p.user_id,
        likeCount,
        score: 40 + (hashtagMatch ? 30 : 0) + Math.min(likeCount / 5, 20),
        matchedField: hashtagMatch ? 'hashtag' : 'content',
        highlightedText: highlightMatch(p.content?.slice(0, 100) || '', query),
        createdAt: p.created_at,
      };
    });
  }, []);

  // Search comments
  const searchComments = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, post_id, user_id, content, created_at')
      .ilike('content', searchTerm)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    return (data || []).map(c => {
      const profile = profileMap.get(c.user_id);
      return {
        id: c.id,
        type: 'comments' as SearchCategory,
        title: c.content?.slice(0, 100) || 'კომენტარი',
        subtitle: profile?.username || 'უცნობი',
        description: 'კომენტარი პოსტზე',
        imageUrl: profile?.avatar_url || undefined,
        userId: c.user_id,
        score: 35,
        highlightedText: highlightMatch(c.content?.slice(0, 100) || '', query),
        createdAt: c.created_at,
      };
    });
  }, []);

  // Search blogs
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
    
    return (data || []).map(b => {
      const similarity = calculateSimilarity(query, b.title);
      return {
        id: b.id,
        type: 'blogs' as SearchCategory,
        title: b.title,
        subtitle: profileMap.get(b.user_id) || 'უცნობი',
        description: b.excerpt || b.content?.slice(0, 150) || undefined,
        imageUrl: b.cover_url || undefined,
        viewCount: b.views_count || 0,
        score: similarity + Math.min((b.views_count || 0) / 10, 15),
        highlightedText: highlightMatch(b.title, query),
        createdAt: b.created_at,
      };
    });
  }, []);

  // Search videos
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
    
    return (data || []).map(v => {
      const similarity = calculateSimilarity(query, v.title || '');
      return {
        id: v.id,
        type: 'videos' as SearchCategory,
        title: v.title || 'ვიდეო',
        subtitle: profileMap.get(v.user_id) || 'უცნობი',
        description: v.description || undefined,
        imageUrl: v.thumbnail_url || undefined,
        viewCount: v.views_count || 0,
        score: similarity + Math.min((v.views_count || 0) / 10, 15),
        highlightedText: highlightMatch(v.title || '', query),
        createdAt: v.created_at,
      };
    });
  }, []);

  // Search music
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
    
    return (data || []).map(m => {
      const similarity = Math.max(
        calculateSimilarity(query, m.title || ''),
        calculateSimilarity(query, m.artist || '')
      );
      return {
        id: m.id,
        type: 'music' as SearchCategory,
        title: m.title || 'უცნობი',
        subtitle: m.artist || 'უცნობი არტისტი',
        description: m.album || undefined,
        imageUrl: m.cover_url || undefined,
        viewCount: m.plays || 0,
        score: similarity + Math.min((m.plays || 0) / 20, 15),
        highlightedText: highlightMatch(m.title || '', query),
        createdAt: m.created_at,
      };
    });
  }, []);

  // Search polls
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
      highlightedText: highlightMatch(p.title || p.question || '', query),
      createdAt: p.created_at,
    }));
  }, []);

  // Events search removed - groups module deleted
  const searchEvents = useCallback(async (_query: string, _limit: number): Promise<SearchResult[]> => {
    return [];
  }, []);

  // Search live streams
  const searchLive = useCallback(async (query: string, limit: number) => {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('live_streams')
      .select('id, host_id, title, status, viewer_count, thumbnail_url, created_at')
      .ilike('title', searchTerm)
      .eq('status', 'live')
      .order('viewer_count', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const hostIds = [...new Set(data?.map(l => l.host_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', hostIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    return (data || []).map(l => {
      const profile = profileMap.get(l.host_id);
      return {
        id: l.id,
        type: 'live' as SearchCategory,
        title: l.title || 'LIVE',
        subtitle: profile?.username || 'უცნობი',
        description: `${l.viewer_count || 0} მაყურებელი`,
        imageUrl: l.thumbnail_url || profile?.avatar_url || undefined,
        userId: l.host_id,
        viewCount: l.viewer_count || 0,
        score: 60 + Math.min((l.viewer_count || 0) / 5, 30),
        createdAt: l.created_at,
      };
    });
  }, []);

  // Search private messages (owner only)
  const searchMessages = useCallback(async (query: string, limit: number) => {
    if (!user) return [];
    
    const searchTerm = `%${query}%`;
    
    // Only search user's own messages
    const { data, error } = await supabase
      .from('private_messages')
      .select('id, conversation_id, content, created_at, sender_id')
      .ilike('content', searchTerm)
      .or(`sender_id.eq.${user.id}`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return (data || []).map(m => ({
      id: m.id,
      type: 'messages' as SearchCategory,
      title: m.content?.slice(0, 100) || 'შეტყობინება',
      subtitle: 'პირადი მიმოწერა',
      score: 30,
      highlightedText: highlightMatch(m.content?.slice(0, 100) || '', query),
      createdAt: m.created_at,
    }));
  }, [user]);

  // Get trending hashtags
  const fetchTrendingHashtags = useCallback(async () => {
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('content')
      .eq('is_approved', true)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(500);
    
    const hashtagCounts = new Map<string, number>();
    
    recentPosts?.forEach(post => {
      const tags = extractHashtags(post.content || '');
      tags.forEach(tag => {
        hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
      });
    });
    
    const trending = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({
        tag,
        count,
        trend: 'stable' as const,
      }));
    
    setTrendingHashtags(trending);
    return trending;
  }, []);

  // Generate search suggestions
  const generateSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const { data: usersData } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', `${query}%`)
      .limit(5);
    
    const userSuggestions = usersData?.map(u => u.username) || [];
    setSuggestions(userSuggestions.filter(Boolean).slice(0, 6) as string[]);
  }, []);

  // Main search function
  const performSearch = useCallback(async (
    query: string, 
    category: SearchCategory = 'all',
    sort: SortOption = 'relevance',
    page: number = 0
  ) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], loading: false, totalCount: 0 }));
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, query, category, sort, page }));

    try {
      const limit = category === 'all' ? 8 : ITEMS_PER_PAGE;
      let allResults: SearchResult[] = [];

      if (category === 'all') {
        const [users, groups, posts, comments, blogs, videos, music, polls, events, live] = await Promise.all([
          searchUsers(query, limit).catch(() => []),
          searchGroups(query, limit).catch(() => []),
          searchPosts(query, limit).catch(() => []),
          searchComments(query, 5).catch(() => []),
          searchBlogs(query, limit).catch(() => []),
          searchVideos(query, limit).catch(() => []),
          searchMusic(query, limit).catch(() => []),
          searchPolls(query, limit).catch(() => []),
          searchEvents(query, limit).catch(() => []),
          searchLive(query, 5).catch(() => []),
        ]);
        
        allResults = [...users, ...groups, ...posts, ...comments, ...blogs, ...videos, ...music, ...polls, ...events, ...live];
      } else {
        switch (category) {
          case 'users': allResults = await searchUsers(query, ITEMS_PER_PAGE); break;
          case 'groups': allResults = await searchGroups(query, ITEMS_PER_PAGE); break;
          case 'posts': allResults = await searchPosts(query, ITEMS_PER_PAGE); break;
          case 'comments': allResults = await searchComments(query, ITEMS_PER_PAGE); break;
          case 'hashtags': allResults = await searchPosts(`#${query.replace(/^#/, '')}`, ITEMS_PER_PAGE); break;
          case 'blogs': allResults = await searchBlogs(query, ITEMS_PER_PAGE); break;
          case 'videos': allResults = await searchVideos(query, ITEMS_PER_PAGE); break;
          case 'music': allResults = await searchMusic(query, ITEMS_PER_PAGE); break;
          case 'polls': allResults = await searchPolls(query, ITEMS_PER_PAGE); break;
          case 'events': allResults = await searchEvents(query, ITEMS_PER_PAGE); break;
          case 'live': allResults = await searchLive(query, ITEMS_PER_PAGE); break;
          case 'messages': allResults = await searchMessages(query, ITEMS_PER_PAGE); break;
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
        totalCount: allResults.length,
      }));

      saveRecentSearch(query);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('AI Search error:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [searchUsers, searchGroups, searchPosts, searchComments, searchBlogs, searchVideos, searchMusic, searchPolls, searchEvents, searchLive, searchMessages]);

  const clearSearch = useCallback(() => {
    setState({
      query: '',
      results: [],
      loading: false,
      category: 'all',
      sort: 'relevance',
      hasMore: false,
      page: 0,
      totalCount: 0,
    });
    setSuggestions([]);
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
    trendingHashtags,
    fetchTrendingHashtags,
    suggestions,
    generateSuggestions,
  };
}

// Recent searches management
const RECENT_SEARCHES_KEY = 'aiSmartRecentSearches';
const MAX_RECENT_SEARCHES = 15;

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
    const updated = [query, ...recent.filter(s => s.toLowerCase() !== query.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearRecentSearch(query: string): void {
  try {
    const recent = getRecentSearches();
    const updated = recent.filter(s => s !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearAllRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}
