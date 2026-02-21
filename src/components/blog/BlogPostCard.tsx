import { useState } from 'react';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { Heart, MessageCircle, Share2, Bookmark, Eye, Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BlogPost } from './types';
import { motion } from 'framer-motion';

interface BlogPostCardProps {
  post: BlogPost;
  variant?: 'default' | 'featured' | 'compact';
  onReadMore: (post: BlogPost) => void;
  onReact: (blogId: string, reactionType: string) => void;
  onBookmark: (blogId: string) => void;
  onAuthorClick?: (userId: string) => void;
}

const reactionEmojis: Record<string, string> = {
  like: '👍',
  love: '❤️',
  care: '🤗',
  haha: '😄',
  wow: '😮',
  sad: '😢',
  angry: '😠',
};

const BlogPostCard = ({ 
  post, 
  variant = 'default', 
  onReadMore, 
  onReact, 
  onBookmark,
  onAuthorClick 
}: BlogPostCardProps) => {
  const [showReactions, setShowReactions] = useState(false);

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
        onClick={() => onReadMore(post)}
      >
        {post.cover_url && (
          <img 
            src={post.cover_url} 
            alt={post.title}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.views_count}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {post.reactions_count || 0}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 ${
        isFeatured ? 'col-span-2 row-span-2' : ''
      }`}
    >
      {/* Cover Image */}
      {post.cover_url && (
        <div 
          className={`relative overflow-hidden cursor-pointer ${isFeatured ? 'aspect-[2/1]' : 'aspect-video'}`}
          onClick={() => onReadMore(post)}
        >
          <img 
            src={post.cover_url} 
            alt={post.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
          {post.category && (
            <Badge 
              className="absolute top-3 left-3"
              style={{ backgroundColor: post.category.color }}
            >
              {post.category.name}
            </Badge>
          )}
          {post.is_featured && (
            <Badge className="absolute top-3 right-3 bg-yellow-500">
              ⭐ რჩეული
            </Badge>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Author */}
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => post.profile && onAuthorClick?.(post.user_id)}
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.profile?.avatar_url || ''} />
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate hover:text-primary transition-colors">
              {post.profile?.username || 'მომხმარებელი'}
              {post.profile?.is_verified && (
                <span className="ml-1 text-primary">✓</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {post.published_at && format(new Date(post.published_at), 'd MMM, yyyy', { locale: ka })}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {post.reading_time_minutes} წთ
          </div>
        </div>

        {/* Title */}
        <h2 
          className={`font-bold cursor-pointer hover:text-primary transition-colors line-clamp-2 ${
            isFeatured ? 'text-xl' : 'text-lg'
          }`}
          onClick={() => onReadMore(post)}
        >
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views_count}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {post.reactions_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {post.comments_count || 0}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Reactions */}
            <div 
              className="relative"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className={post.user_reaction ? 'text-primary' : ''}
              >
                {post.user_reaction ? reactionEmojis[post.user_reaction] : <Heart className="w-4 h-4" />}
              </Button>
              
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 bg-popover rounded-full shadow-lg border border-border z-10"
                >
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReact(post.id, type);
                      }}
                      className="text-xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={() => onReadMore(post)}>
              <MessageCircle className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onBookmark(post.id);
              }}
              className={post.is_bookmarked ? 'text-primary' : ''}
            >
              <Bookmark className={`w-4 h-4 ${post.is_bookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default BlogPostCard;
