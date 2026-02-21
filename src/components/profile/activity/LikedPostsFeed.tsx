import { useRef, useEffect } from 'react';
import { Loader2, Heart, HeartOff } from 'lucide-react';
import { useLikedPosts } from './useSavedLikedPosts';
import ActivityFeedCard from './ActivityFeedCard';
import { Skeleton } from '@/components/ui/skeleton';

interface LikedPostsFeedProps {
  onUserClick?: (userId: string) => void;
  onGroupClick?: (groupId: string) => void;
}

const LikedPostsFeed = ({ onUserClick, onGroupClick }: LikedPostsFeedProps) => {
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh
  } = useLikedPosts();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h2 className="font-semibold">მოწონებული პოსტები</h2>
          <span className="text-sm text-muted-foreground">({posts.length})</span>
        </div>
      </div>

      {/* Posts List */}
      <div className="px-4 space-y-4 mt-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <HeartOff className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">მოწონებული პოსტები არ გაქვთ</p>
            <p className="text-sm text-muted-foreground mt-1">
              პოსტების მოსაწონებლად დააჭირეთ რეაქციის ღილაკს
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <ActivityFeedCard
              key={post.id}
              activity={post}
              onUserClick={onUserClick}
              onGroupClick={onGroupClick}
            />
          ))
        )}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="py-4">
          {loadingMore && (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LikedPostsFeed;
