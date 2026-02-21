import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MentionUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_friend: boolean;
}

export interface HashtagSuggestion {
  tag: string;
  count: number;
}

// Cache for user searches to reduce API calls
const userSearchCache = new Map<string, { data: MentionUser[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export function useMentionSuggestions() {
  const { user } = useAuth();
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionUser[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch friends/following for mention suggestions
  const searchMentions = useCallback(async (query: string) => {
    if (!user?.id || query.length < 1) {
      setMentionSuggestions([]);
      return;
    }

    // Check cache first
    const cacheKey = `${user.id}-${query.toLowerCase()}`;
    const cached = userSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setMentionSuggestions(cached.data);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      // Get friends/following IDs first
      const [friendsResult, followingResult] = await Promise.all([
        supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id)
      ]);

      const friendIds = new Set<string>();
      friendsResult.data?.forEach(f => {
        if (f.requester_id === user.id) friendIds.add(f.addressee_id);
        else friendIds.add(f.requester_id);
      });
      followingResult.data?.forEach(f => friendIds.add(f.following_id));

      // Search profiles that match the query - prioritize friends
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('user_id', user.id)
        .limit(15);

      if (profiles) {
        const results: MentionUser[] = profiles.map(p => ({
          user_id: p.user_id,
          username: p.username,
          avatar_url: p.avatar_url,
          is_friend: friendIds.has(p.user_id)
        }));

        // Sort: friends first, then alphabetically
        results.sort((a, b) => {
          if (a.is_friend && !b.is_friend) return -1;
          if (!a.is_friend && b.is_friend) return 1;
          return a.username.localeCompare(b.username);
        });

        const finalResults = results.slice(0, 8);
        setMentionSuggestions(finalResults);
        
        // Cache results
        userSearchCache.set(cacheKey, { data: finalResults, timestamp: Date.now() });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error searching mentions:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Search hashtags from existing posts
  const searchHashtags = useCallback(async (query: string) => {
    if (query.length < 1) {
      setHashtagSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      // Search posts for hashtags containing the query
      const { data: posts } = await supabase
        .from('posts')
        .select('content')
        .eq('is_approved', true)
        .ilike('content', `%#${query}%`)
        .limit(100);

      if (posts) {
        const hashtagCounts = new Map<string, number>();
        const hashtagRegex = /#([\wა-ჰ]+)/gi;

        posts.forEach(post => {
          if (!post.content) return;
          let match;
          while ((match = hashtagRegex.exec(post.content)) !== null) {
            const tag = match[1].toLowerCase();
            if (tag.includes(query.toLowerCase())) {
              hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
            }
          }
        });

        const suggestions: HashtagSuggestion[] = Array.from(hashtagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setHashtagSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error searching hashtags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setMentionSuggestions([]);
    setHashtagSuggestions([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    mentionSuggestions,
    hashtagSuggestions,
    loading,
    searchMentions,
    searchHashtags,
    clearSuggestions
  };
}
