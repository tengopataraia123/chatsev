import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hash, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import HashtagMentionText from './HashtagMentionText';
import GenderAvatar from '@/components/shared/GenderAvatar';
import TopGeCounter from '@/components/TopGeCounter';

interface HashtagViewProps {
  hashtag?: string;
  onBack?: () => void;
  onUserClick?: (userId: string) => void;
  onHashtagClick?: (tag: string) => void;
}

interface PostWithHashtag {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  profile: {
    username: string;
    avatar_url: string | null;
    gender?: string;
  } | null;
}

interface TrendingHashtag {
  tag: string;
  count: number;
}

const HashtagView = memo(({ hashtag: propHashtag, onBack, onUserClick, onHashtagClick }: HashtagViewProps) => {
  const navigate = useNavigate();
  const { tag: urlTag } = useParams<{ tag: string }>();
  const hashtag = propHashtag || urlTag || '';
  
  const [posts, setPosts] = useState<PostWithHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const { user } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const fetchPostsWithHashtag = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch posts containing the hashtag
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, user_id, content, image_url, video_url, created_at')
        .eq('is_approved', true)
        .ilike('content', `%#${hashtag}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsData) {
        // Fetch profiles for all posts
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender')
          .in('user_id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const mappedPosts: PostWithHashtag[] = postsData.map(post => ({
          ...post,
          profile: profilesMap.get(post.user_id) || null
        }));

        setPosts(mappedPosts);
      }
    } catch (error) {
      console.error('Error fetching hashtag posts:', error);
    } finally {
      setLoading(false);
    }
  }, [hashtag]);

  const fetchTrendingHashtags = useCallback(async () => {
    try {
      // Fetch recent posts to extract trending hashtags
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('content')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (recentPosts) {
        const hashtagCounts = new Map<string, number>();
        const hashtagRegex = /#([\wა-ჰ]+)/gi;

        recentPosts.forEach(post => {
          if (!post.content) return;
          let match;
          while ((match = hashtagRegex.exec(post.content)) !== null) {
            const tag = match[1].toLowerCase();
            hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
          }
        });

        const trending = Array.from(hashtagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .filter(t => t.tag !== hashtag.toLowerCase())
          .slice(0, 10);

        setTrendingHashtags(trending);
      }
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
    }
  }, [hashtag]);

  useEffect(() => {
    fetchPostsWithHashtag();
    fetchTrendingHashtags();
  }, [fetchPostsWithHashtag, fetchTrendingHashtags]);

  const handleLocalHashtagClick = (tag: string) => {
    if (onHashtagClick) {
      onHashtagClick(tag);
    } else {
      navigate(`/hashtag/${tag}`);
    }
  };

  const handleUserClickLocal = async (username: string) => {
    // Resolve username to userId
    const { data } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('username', username)
      .maybeSingle();
    
    if (data?.user_id) {
      if (onUserClick) {
        onUserClick(data.user_id);
      } else {
        navigate(`/?view=profile&userId=${data.user_id}`);
      }
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">#{hashtag}</h1>
              <p className="text-xs text-muted-foreground">
                {posts.length} პოსტი
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Main Content - Posts */}
        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <Hash className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-2">პოსტები ვერ მოიძებნა</h3>
              <p className="text-muted-foreground">
                #{hashtag} ჰეშთეგით პოსტები ჯერ არ არის
              </p>
            </div>
          ) : (
            posts.map(post => (
              <article
                key={post.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Post Header */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => post.profile && handleUserClickLocal(post.profile.username)}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <GenderAvatar
                      userId={post.user_id}
                      src={post.profile?.avatar_url}
                      gender={post.profile?.gender}
                      username={post.profile?.username || 'User'}
                      className="w-10 h-10"
                    />
                  </button>
                  <div>
                    <button
                      onClick={() => post.profile && handleUserClickLocal(post.profile.username)}
                      className="font-semibold text-sm hover:underline"
                    >
                      {post.profile?.username || 'უცნობი'}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka })}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                {post.content && (
                  <div className="px-4 pb-3">
                    <HashtagMentionText
                      content={post.content}
                      onHashtagClick={handleLocalHashtagClick}
                      onUserClick={handleUserClickLocal}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Post Image */}
                {post.image_url && (
                  <div className="px-4 pb-4">
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full rounded-lg object-cover max-h-96"
                      loading="lazy"
                    />
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {/* Sidebar - Trending Hashtags */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-card rounded-xl border border-border p-4 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">ტრენდული ჰეშთეგები</h2>
            </div>
            
            <div className="space-y-2">
              {trendingHashtags.map((trending, index) => (
                <button
                  key={trending.tag}
                  onClick={() => handleLocalHashtagClick(trending.tag)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm block truncate">#{trending.tag}</span>
                    <span className="text-xs text-muted-foreground">{trending.count} პოსტი</span>
                  </div>
                </button>
              ))}
              
              {trendingHashtags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ტრენდული ჰეშთეგები ჯერ არ არის
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* TOP.GE Counter - only for standalone route /hashtag/:tag */}
      {!onBack && <TopGeCounter />}
    </div>
  );
});

HashtagView.displayName = 'HashtagView';

export default HashtagView;
