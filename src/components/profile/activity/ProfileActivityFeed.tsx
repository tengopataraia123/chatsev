import { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, FileText, Image, Video, Users, Share2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useProfileActivity } from './useProfileActivity';
import ActivityFeedCard from './ActivityFeedCard';
import { ActivityFilter, ActivityItem } from './types';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileActivityFeedProps {
  userId: string;
  onUserClick?: (userId: string) => void;
  onGroupClick?: (groupId: string) => void;
  canDelete?: boolean;
}

const FILTER_TABS: { id: ActivityFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'ყველა', icon: <FileText className="w-4 h-4" /> },
  { id: 'posts', label: 'პოსტები', icon: <FileText className="w-4 h-4" /> },
  { id: 'shares', label: 'გაზიარებები', icon: <Share2 className="w-4 h-4" /> },
  { id: 'photos', label: 'ფოტოები', icon: <Image className="w-4 h-4" /> },
  { id: 'videos', label: 'ვიდეოები', icon: <Video className="w-4 h-4" /> },
  { id: 'groups', label: 'ჯგუფები', icon: <Users className="w-4 h-4" /> },
];

const ProfileActivityFeed = ({ userId, onUserClick, onGroupClick, canDelete }: ProfileActivityFeedProps) => {
  const {
    activities: fetchedActivities,
    loading,
    loadingMore,
    hasMore,
    filter,
    searchQuery,
    setSearchQuery,
    changeFilter,
    loadMore,
    refresh
  } = useProfileActivity(userId);

  // Local state for immediate UI updates on delete
  const [localActivities, setLocalActivities] = useState<ActivityItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Sync fetched activities with local state
  useEffect(() => {
    setLocalActivities(fetchedActivities.filter(a => !deletedIds.has(a.id)));
  }, [fetchedActivities, deletedIds]);

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

  // Handle delete - immediately remove from UI and track deleted IDs
  const handleDelete = useCallback((activityId: string) => {
    // Immediately remove from local state
    setLocalActivities(prev => prev.filter(a => a.id !== activityId));
    // Track deleted ID so it doesn't come back on refresh
    setDeletedIds(prev => new Set([...prev, activityId]));
  }, []);

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
    <div className="pb-4 w-full overflow-x-hidden" style={{ maxWidth: '100vw' }}>
      {/* Filter Chips */}
      <div className="px-4 py-3 border-b border-border">
        <div 
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => changeFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                filter === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ძებნა აქტივობებში..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
      </div>

      {/* Activities List */}
      <div className="px-2 sm:px-4 space-y-4 mt-2 w-full overflow-x-hidden">
        {localActivities.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">ჯერ აქტივობა არ არის</p>
          </div>
        ) : (
          localActivities.map((activity) => (
            <ActivityFeedCard
              key={activity.id}
              activity={activity}
              onUserClick={onUserClick}
              onGroupClick={onGroupClick}
              onDelete={handleDelete}
              canDelete={canDelete}
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

export default ProfileActivityFeed;
