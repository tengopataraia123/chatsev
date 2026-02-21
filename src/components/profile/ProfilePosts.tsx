import { Heart, MessageCircle, Image, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Post {
  id: string;
  image_url: string | null;
  content?: string | null;
  likes_count: number;
}

interface ProfilePostsProps {
  posts: Post[];
  loading: boolean;
  emptyMessage: string;
  onPostClick?: (postId: string) => void;
}

const ProfilePosts = ({ posts, loading, emptyMessage, onPostClick }: ProfilePostsProps) => {
  if (loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {posts.map((post) => (
          <button 
            key={post.id} 
            className="aspect-square relative group overflow-hidden rounded-lg bg-secondary"
            onClick={() => onPostClick?.(post.id)}
          >
            {post.image_url ? (
              <img 
                src={post.image_url} 
                alt="" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-primary/10 to-secondary">
                <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                {post.content && (
                  <p className="text-xs text-muted-foreground text-center line-clamp-3 leading-tight">
                    {post.content.slice(0, 60)}{post.content.length > 60 ? '...' : ''}
                  </p>
                )}
              </div>
            )}
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-white">
                <Heart className="w-5 h-5 fill-current" />
                <span className="font-semibold">{post.likes_count}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfilePosts;
