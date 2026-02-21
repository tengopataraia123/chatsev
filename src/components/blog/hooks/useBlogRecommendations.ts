import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RecommendedArticle } from '../types';

export function useBlogRecommendations(currentBlogId?: string) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const calculatePopularityScore = (post: any) => {
    const views = post.views_count || 0;
    const reactions = post.reactions_count || 0;
    const comments = post.comments_count || 0;
    const shares = post.shares_count || 0;

    return (views * 0.3) + (reactions * 0.4) + (comments * 0.2) + (shares * 0.1);
  };

  const calculateFreshnessBoost = (publishedAt: string) => {
    const now = new Date();
    const published = new Date(publishedAt);
    const hoursSincePublished = (now.getTime() - published.getTime()) / (1000 * 60 * 60);

    if (hoursSincePublished < 24) return 50;
    if (hoursSincePublished < 48) return 30;
    if (hoursSincePublished < 72) return 15;
    if (hoursSincePublished < 168) return 5;
    return 0;
  };

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all approved posts
      const { data: posts, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(*)
        `)
        .eq('status', 'approved')
        .neq('id', currentBlogId || '')
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get user interests if logged in
      let userInterests: { category_id?: string; tag?: string; score: number }[] = [];
      if (user) {
        const { data: interests } = await supabase
          .from('user_blog_interests')
          .select('category_id, tag, score')
          .eq('user_id', user.id);
        
        userInterests = interests || [];
      }

      // Get current post for similarity matching
      let currentPost: any = null;
      if (currentBlogId) {
        const { data } = await supabase
          .from('blog_posts')
          .select('category_id, tags')
          .eq('id', currentBlogId)
          .single();
        currentPost = data;
      }

      // Score each post
      const scoredPosts = await Promise.all(
        (posts || []).map(async (post) => {
          // Get engagement stats
          const { count: reactionsCount } = await supabase
            .from('blog_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('blog_id', post.id);

          const { count: commentsCount } = await supabase
            .from('blog_comments')
            .select('*', { count: 'exact', head: true })
            .eq('blog_id', post.id);

          const { count: sharesCount } = await supabase
            .from('blog_shares')
            .select('*', { count: 'exact', head: true })
            .eq('blog_id', post.id);

          const enrichedPost = {
            ...post,
            profile: profileMap.get(post.user_id),
            reactions_count: reactionsCount || 0,
            comments_count: commentsCount || 0,
            shares_count: sharesCount || 0,
          };

          // Calculate scores
          let score = 0;
          let reason = '';

          // Popularity score
          const popularityScore = calculatePopularityScore(enrichedPost);
          score += popularityScore;

          // Freshness boost
          if (post.published_at) {
            const freshnessBoost = calculateFreshnessBoost(post.published_at);
            score += freshnessBoost;
            if (freshnessBoost > 30) reason = 'ახალი';
          }

          // Interest match
          const categoryInterest = userInterests.find(i => i.category_id === post.category_id);
          if (categoryInterest) {
            score += categoryInterest.score * 20;
            reason = reason || 'თქვენი ინტერესებიდან';
          }

          // Tag match
          const tagMatches = (post.tags || []).filter(tag => 
            userInterests.some(i => i.tag === tag)
          );
          score += tagMatches.length * 10;

          // Similar to current post
          if (currentPost) {
            if (post.category_id === currentPost.category_id) {
              score += 25;
              reason = reason || 'მსგავსი თემატიკა';
            }
            const commonTags = (post.tags || []).filter(tag => 
              (currentPost.tags || []).includes(tag)
            );
            score += commonTags.length * 15;
          }

          // Featured boost
          if (post.is_featured) {
            score += 30;
            reason = reason || 'რჩეული';
          }

          return {
            ...enrichedPost,
            recommendation_score: score,
            recommendation_reason: reason || 'პოპულარული',
          } as RecommendedArticle;
        })
      );

      // Sort by score and take top recommendations
      const sortedPosts = scoredPosts
        .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0))
        .slice(0, 10);

      setRecommendations(sortedPosts);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentBlogId, user]);

  const updateUserInterest = async (categoryId?: string, tag?: string) => {
    if (!user) return;

    try {
      // Upsert interest
      await supabase
        .from('user_blog_interests')
        .upsert({
          user_id: user.id,
          category_id: categoryId,
          tag,
          score: 1,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,category_id,tag',
        });
    } catch (error) {
      console.error('Error updating user interest:', error);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    updateUserInterest,
    refreshRecommendations: fetchRecommendations,
  };
}
