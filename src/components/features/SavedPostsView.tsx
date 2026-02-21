import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Bookmark, Heart, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SavedPostsViewProps {
  onBack: () => void;
}

interface SavedPost {
  id: string;
  post_id: string;
  post: {
    id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
    likes_count: number;
    comments_count: number;
  };
}

const SavedPostsView = ({ onBack }: SavedPostsViewProps) => {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user) return;

      try {
        const { data: savedData, error } = await supabase
          .from('saved_posts')
          .select('id, post_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (savedData && savedData.length > 0) {
          const postIds = savedData.map(s => s.post_id);
          
          const { data: postsData } = await supabase
            .from('posts')
            .select('*')
            .in('id', postIds);

          if (!postsData) return;

          // Get user profiles
          const userIds = [...new Set(postsData.map(p => p.user_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', userIds);

          const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

          // Get likes and comments counts
          const postsWithCounts = await Promise.all(
            postsData.map(async (post) => {
              const { count: likesCount } = await supabase
                .from('post_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              const { count: commentsCount } = await supabase
                .from('post_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              const profile = profilesMap.get(post.user_id);

              return {
                ...post,
                profiles: profile || { username: 'Unknown', avatar_url: null },
                likes_count: likesCount || 0,
                comments_count: commentsCount || 0,
              };
            })
          );

          const enrichedData = savedData.map(saved => ({
            ...saved,
            post: postsWithCounts.find(p => p.id === saved.post_id)
          })).filter(s => s.post);

          setSavedPosts(enrichedData as SavedPost[]);
        }
      } catch (error) {
        console.error('Error fetching saved posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, [user]);

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'ახლახანს';
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} დღის წინ`;
    return postDate.toLocaleDateString('ka-GE');
  };

  const handleUnsave = async (savedId: string) => {
    try {
      await supabase.from('saved_posts').delete().eq('id', savedId);
      setSavedPosts(prev => prev.filter(p => p.id !== savedId));
    } catch (error) {
      console.error('Error unsaving:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">შენახული პოსტები</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>შენახული პოსტები არ გაქვს</p>
          </div>
        ) : (
          savedPosts.map((saved) => (
            <div key={saved.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={saved.post.profiles?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                      {saved.post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{saved.post.profiles?.username}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(saved.post.created_at)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnsave(saved.id)}
                  className="p-2 hover:bg-secondary rounded-lg text-primary"
                >
                  <Bookmark className="w-5 h-5 fill-current" />
                </button>
              </div>

              {/* Content */}
              {saved.post.content && (
                <p className="px-4 pb-3">{saved.post.content}</p>
              )}

              {/* Image */}
              {saved.post.image_url && (
                <img 
                  src={saved.post.image_url} 
                  alt="" 
                  className="w-full max-h-96 object-cover"
                />
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 p-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" /> {saved.post.likes_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" /> {saved.post.comments_count}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SavedPostsView;
