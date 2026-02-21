import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BlogPost, BlogCategory } from '../types';
import { toast } from 'sonner';

export function useBlogPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (data) setCategories(data);
  }, []);

  const enrichPostWithStats = async (post: any): Promise<BlogPost> => {
    // Get reactions count
    const { count: reactionsCount } = await supabase
      .from('blog_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('blog_id', post.id);

    // Get comments count
    const { count: commentsCount } = await supabase
      .from('blog_comments')
      .select('*', { count: 'exact', head: true })
      .eq('blog_id', post.id)
      .eq('is_deleted', false);

    // Get shares count
    const { count: sharesCount } = await supabase
      .from('blog_shares')
      .select('*', { count: 'exact', head: true })
      .eq('blog_id', post.id);

    // Get user reaction if logged in
    let userReaction = null;
    let isBookmarked = false;
    
    if (user) {
      const { data: reactionData } = await supabase
        .from('blog_reactions')
        .select('reaction_type')
        .eq('blog_id', post.id)
        .eq('user_id', user.id)
        .single();
      
      userReaction = reactionData?.reaction_type;

      const { data: bookmarkData } = await supabase
        .from('blog_bookmarks')
        .select('id')
        .eq('blog_id', post.id)
        .eq('user_id', user.id)
        .single();
      
      isBookmarked = !!bookmarkData;
    }

    return {
      ...post,
      reactions_count: reactionsCount || 0,
      comments_count: commentsCount || 0,
      shares_count: sharesCount || 0,
      user_reaction: userReaction,
      is_bookmarked: isBookmarked,
    };
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(*)
        `)
        .eq('status', 'approved')
        .order('published_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      // Enrich posts with stats
      const enrichedPosts = await Promise.all(
        (data || []).map(async (post) => {
          const enriched = await enrichPostWithStats(post);
          return {
            ...enriched,
            profile: profileMap.get(post.user_id),
          };
        })
      );

      setPosts(enrichedPosts);

      // Featured posts
      const featured = enrichedPosts.filter(p => p.is_featured).slice(0, 3);
      setFeaturedPosts(featured);

      // Popular posts (sorted by engagement)
      const popular = [...enrichedPosts]
        .sort((a, b) => {
          const scoreA = (a.views_count * 0.3) + ((a.reactions_count || 0) * 0.4) + ((a.comments_count || 0) * 0.2) + ((a.shares_count || 0) * 0.1);
          const scoreB = (b.views_count * 0.3) + ((b.reactions_count || 0) * 0.4) + ((b.comments_count || 0) * 0.2) + ((b.shares_count || 0) * 0.1);
          return scoreB - scoreA;
        })
        .slice(0, 5);
      setPopularPosts(popular);

    } catch (error) {
      console.error('Error fetching blog posts:', error);
      toast.error('შეცდომა სტატიების ჩატვირთვისას');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, user]);

  const createPost = async (postData: Partial<BlogPost>) => {
    if (!user) {
      toast.error('გაიარეთ ავტორიზაცია');
      return null;
    }

    try {
      // Generate slug from title
      const slug = postData.title
        ?.toLowerCase()
        .replace(/[^a-z0-9ა-ჰ]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();

      // Calculate reading time (approx 200 words per minute)
      const wordCount = postData.content?.split(/\s+/).length || 0;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          user_id: user.id,
          title: postData.title,
          slug,
          content: postData.content,
          excerpt: postData.excerpt || postData.content?.substring(0, 200),
          cover_url: postData.cover_url,
          category_id: postData.category_id,
          tags: postData.tags || [],
          status: 'pending',
          reading_time_minutes: readingTime,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('სტატია გაიგზავნა მოდერაციისთვის');
      return data;
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('შეცდომა სტატიის შექმნისას');
      return null;
    }
  };

  const reactToPost = async (blogId: string, reactionType: string) => {
    if (!user) {
      toast.error('გაიარეთ ავტორიზაცია');
      return;
    }

    try {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('blog_reactions')
        .select('id, reaction_type')
        .eq('blog_id', blogId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          await supabase
            .from('blog_reactions')
            .delete()
            .eq('id', existing.id);
        } else {
          // Update reaction
          await supabase
            .from('blog_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existing.id);
        }
      } else {
        // Add new reaction
        await supabase
          .from('blog_reactions')
          .insert({
            blog_id: blogId,
            user_id: user.id,
            reaction_type: reactionType,
          });
      }

      // Refresh posts
      fetchPosts();
    } catch (error) {
      console.error('Error reacting to post:', error);
    }
  };

  const bookmarkPost = async (blogId: string) => {
    if (!user) {
      toast.error('გაიარეთ ავტორიზაცია');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('blog_bookmarks')
        .select('id')
        .eq('blog_id', blogId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('blog_bookmarks')
          .delete()
          .eq('id', existing.id);
        toast.success('სტატია წაიშალა შენახულებიდან');
      } else {
        await supabase
          .from('blog_bookmarks')
          .insert({
            blog_id: blogId,
            user_id: user.id,
          });
        toast.success('სტატია შენახულია');
      }

      fetchPosts();
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const recordView = async (blogId: string) => {
    try {
      await supabase.from('blog_views').insert({
        blog_id: blogId,
        user_id: user?.id,
      });

      // Increment views count directly
      const { data: currentPost } = await supabase
        .from('blog_posts')
        .select('views_count')
        .eq('id', blogId)
        .single();
      
      if (currentPost) {
        await supabase
          .from('blog_posts')
          .update({ views_count: (currentPost.views_count || 0) + 1 })
          .eq('id', blogId);
      }
    } catch (error) {
      // Silent fail for view tracking
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, [fetchCategories, fetchPosts]);

  return {
    posts,
    featuredPosts,
    popularPosts,
    categories,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    createPost,
    reactToPost,
    bookmarkPost,
    recordView,
    refreshPosts: fetchPosts,
  };
}
