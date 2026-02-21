import { memo } from 'react';

// Inline skeleton styles for fastest render (no CSS dependency)
const skeletonStyle = {
  background: 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground)/0.1) 50%, hsl(var(--muted)) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
};

// Shimmer effect component for more realistic loading
const ShimmerBlock = memo(({ className }: { className: string }) => (
  <div className={`${className} bg-muted animate-pulse relative overflow-hidden`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
));
ShimmerBlock.displayName = 'ShimmerBlock';

// Feed skeleton - shows immediately while posts load
export const FeedSkeleton = memo(() => (
  <div className="space-y-3 px-2 sm:px-0">
    {[1, 2, 3].map(i => (
      <div 
        key={i} 
        className="bg-card rounded-2xl p-4 border border-border/40 overflow-hidden relative"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-muted/60 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 bg-muted/60 rounded-full animate-pulse" />
            <div className="h-3 w-20 bg-muted/40 rounded-full animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-full bg-muted/30 animate-pulse" />
        </div>
        {/* Content lines */}
        <div className="space-y-2.5 mb-4">
          <div className="h-4 w-full bg-muted/50 rounded-full animate-pulse" />
          <div className="h-4 w-4/5 bg-muted/40 rounded-full animate-pulse" />
          <div className="h-4 w-2/3 bg-muted/30 rounded-full animate-pulse" />
        </div>
        {/* Image placeholder */}
        <div className="h-52 w-full bg-muted/40 rounded-xl animate-pulse mb-4" />
        {/* Actions */}
        <div className="flex justify-between pt-3 border-t border-border/30">
          <div className="h-8 w-24 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </div>
    ))}
  </div>
));
FeedSkeleton.displayName = 'FeedSkeleton';

// Conversation list skeleton
export const ConversationListSkeleton = memo(() => (
  <div className="space-y-2 p-2">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
        <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-28 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-3 w-10 bg-muted rounded animate-pulse" />
      </div>
    ))}
  </div>
));
ConversationListSkeleton.displayName = 'ConversationListSkeleton';

// Messages skeleton
export const MessagesSkeleton = memo(() => (
  <div className="flex-1 p-4 space-y-4">
    {/* Received messages */}
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      <div className="max-w-[70%]">
        <div className="h-16 w-48 bg-muted rounded-2xl rounded-tl-sm animate-pulse" />
      </div>
    </div>
    {/* Sent message */}
    <div className="flex justify-end">
      <div className="max-w-[70%]">
        <div className="h-12 w-56 bg-primary/30 rounded-2xl rounded-tr-sm animate-pulse" />
      </div>
    </div>
    {/* Received */}
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      <div className="max-w-[70%]">
        <div className="h-20 w-64 bg-muted rounded-2xl rounded-tl-sm animate-pulse" />
      </div>
    </div>
    {/* Sent */}
    <div className="flex justify-end">
      <div className="max-w-[70%]">
        <div className="h-10 w-40 bg-primary/30 rounded-2xl rounded-tr-sm animate-pulse" />
      </div>
    </div>
  </div>
));
MessagesSkeleton.displayName = 'MessagesSkeleton';

// Stories row skeleton - Bento-style modular
export const StoriesRowSkeleton = memo(() => (
  <div className="flex gap-3 p-4 overflow-hidden">
    {/* Add story button skeleton */}
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="w-[70px] h-[100px] rounded-xl bg-muted animate-pulse" />
    </div>
    {/* Stories */}
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-[70px] h-[100px] rounded-xl bg-muted animate-pulse" />
        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
      </div>
    ))}
  </div>
));
StoriesRowSkeleton.displayName = 'StoriesRowSkeleton';

// Reels skeleton - Full screen vertical video style
export const ReelsSkeleton = memo(() => (
  <div className="h-full w-full bg-background flex items-center justify-center">
    <div className="w-full max-w-sm aspect-[9/16] bg-muted rounded-xl animate-pulse relative">
      {/* Profile info skeleton */}
      <div className="absolute bottom-4 left-4 right-16 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-background/30 animate-pulse" />
          <div className="h-4 w-24 bg-background/30 rounded animate-pulse" />
        </div>
        <div className="h-3 w-full bg-background/30 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-background/30 rounded animate-pulse" />
      </div>
      {/* Action buttons skeleton */}
      <div className="absolute bottom-4 right-4 space-y-4">
        <div className="w-10 h-10 rounded-full bg-background/30 animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-background/30 animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-background/30 animate-pulse" />
      </div>
      {/* Play icon center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-background/20 animate-pulse" />
      </div>
    </div>
  </div>
));
ReelsSkeleton.displayName = 'ReelsSkeleton';

// Profile header skeleton
export const ProfileHeaderSkeleton = memo(() => (
  <div className="p-4">
    {/* Cover */}
    <div className="h-32 w-full bg-muted rounded-t-xl animate-pulse" />
    {/* Avatar and info */}
    <div className="relative px-4 pb-4 bg-card rounded-b-xl border border-t-0 border-border">
      <div className="w-24 h-24 rounded-full bg-muted animate-pulse border-4 border-card -mt-12" />
      <div className="mt-3 space-y-2">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
      </div>
      {/* Stats */}
      <div className="flex gap-6 mt-4">
        <div className="text-center">
          <div className="h-5 w-8 bg-muted rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="text-center">
          <div className="h-5 w-8 bg-muted rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="text-center">
          <div className="h-5 w-8 bg-muted rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  </div>
));
ProfileHeaderSkeleton.displayName = 'ProfileHeaderSkeleton';

// Generic list item skeleton
export const ListItemSkeleton = memo(({ count = 5 }: { count?: number }) => (
  <div className="space-y-2 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-muted rounded animate-pulse mb-1" />
          <div className="h-3 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
));
ListItemSkeleton.displayName = 'ListItemSkeleton';

// Card grid skeleton - Bento style
export const CardGridSkeleton = memo(({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-xl overflow-hidden border border-border">
        <div className="aspect-square bg-muted animate-pulse" />
        <div className="p-3 space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
));
CardGridSkeleton.displayName = 'CardGridSkeleton';

// Post card skeleton - Individual post loading
export const PostCardSkeleton = memo(() => (
  <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-full bg-muted" />
      <div className="flex-1">
        <div className="h-4 w-28 bg-muted rounded mb-2" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
      <div className="w-8 h-8 rounded-full bg-muted" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-4 w-4/5 bg-muted rounded" />
    </div>
    <div className="h-56 w-full bg-muted rounded-lg mb-4" />
    <div className="flex justify-between pt-2 border-t border-border">
      <div className="h-9 w-20 bg-muted rounded" />
      <div className="h-9 w-20 bg-muted rounded" />
      <div className="h-9 w-20 bg-muted rounded" />
    </div>
  </div>
));
PostCardSkeleton.displayName = 'PostCardSkeleton';

// Notification skeleton
export const NotificationSkeleton = memo(({ count = 5 }: { count?: number }) => (
  <div className="space-y-2 p-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
        <div className="w-12 h-12 rounded-full bg-muted animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
));
NotificationSkeleton.displayName = 'NotificationSkeleton';

// Comments skeleton
export const CommentsSkeleton = memo(({ count = 3 }: { count?: number }) => (
  <div className="space-y-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="bg-muted/50 rounded-2xl p-3 space-y-2">
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-4 px-2">
            <div className="h-3 w-8 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    ))}
  </div>
));
CommentsSkeleton.displayName = 'CommentsSkeleton';

// Bento card skeleton - Modern modular card
export const BentoCardSkeleton = memo(({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
  const heightClass = size === 'small' ? 'h-24' : size === 'large' ? 'h-48' : 'h-36';
  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${heightClass} animate-pulse`}>
      <div className="h-full w-full bg-muted relative">
        <div className="absolute bottom-3 left-3 right-3 space-y-2">
          <div className="h-4 w-3/4 bg-background/30 rounded" />
          <div className="h-3 w-1/2 bg-background/30 rounded" />
        </div>
      </div>
    </div>
  );
});
BentoCardSkeleton.displayName = 'BentoCardSkeleton';
