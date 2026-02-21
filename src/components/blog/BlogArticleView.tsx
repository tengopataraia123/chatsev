import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { 
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Eye, Clock, 
  User, Flag, UserPlus, Send, Loader2 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlogPost, BlogComment } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useBlogRecommendations } from './hooks/useBlogRecommendations';
import BlogPostCard from './BlogPostCard';

interface BlogArticleViewProps {
  post: BlogPost;
  onBack: () => void;
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

const BlogArticleView = ({ post, onBack, onReact, onBookmark, onAuthorClick }: BlogArticleViewProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const { recommendations } = useBlogRecommendations(post.id);

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('blog_id', post.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      // Organize comments with replies
      const commentsMap = new Map<string, BlogComment>();
      const rootComments: BlogComment[] = [];

      (data || []).forEach(comment => {
        const enriched: BlogComment = {
          ...comment,
          profile: profileMap.get(comment.user_id),
          replies: [],
        };
        commentsMap.set(comment.id, enriched);
      });

      commentsMap.forEach(comment => {
        if (comment.parent_id) {
          const parent = commentsMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('გაიარეთ ავტორიზაცია');
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('blog_comments')
        .insert({
          blog_id: post.id,
          user_id: user.id,
          parent_id: replyTo,
          content: newComment,
        });

      if (error) throw error;

      setNewComment('');
      setReplyTo(null);
      fetchComments();
      toast.success('კომენტარი დაემატა');
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('შეცდომა კომენტარის დამატებისას');
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderContent = () => {
    // Simple markdown-like rendering
    let html = post.content
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 italic bg-secondary/30 rounded-r">$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="my-4">')
      .replace(/\n/g, '<br>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-6 mx-auto">')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank">$1</a>')
      .replace(/#(\w+)/g, '<span class="text-primary font-medium">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-blue-500 font-medium">@$1</span>')
      .replace(/^---$/gm, '<hr class="my-8 border-border">');

    return `<p class="my-4">${html}</p>`;
  };

  const CommentItem = ({ comment, isReply = false }: { comment: BlogComment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.profile?.avatar_url || ''} />
          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-secondary/50 rounded-lg px-3 py-2">
            <p className="text-sm font-medium">{comment.profile?.username || 'მომხმარებელი'}</p>
            <p className="text-sm">{comment.content}</p>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>{format(new Date(comment.created_at), 'dd MMM, HH:mm', { locale: ka })}</span>
            <button 
              className="hover:text-primary"
              onClick={() => setReplyTo(comment.id)}
            >
              პასუხი
            </button>
          </div>
        </div>
      </div>
      {comment.replies?.map(reply => (
        <CommentItem key={reply.id} comment={reply} isReply />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 p-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-medium truncate">{post.title}</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onBookmark(post.id)}
            className={post.is_bookmarked ? 'text-primary' : ''}
          >
            <Bookmark className={`w-5 h-5 ${post.is_bookmarked ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-60px)]">
        <article className="max-w-4xl mx-auto px-4 py-6">
          {/* Cover */}
          {post.cover_url && (
            <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
              <img 
                src={post.cover_url} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
              {post.category && (
                <Badge 
                  className="absolute top-4 left-4"
                  style={{ backgroundColor: post.category.color }}
                >
                  {post.category.name}
                </Badge>
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-6">{post.title}</h1>

          {/* Author Block */}
          <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => post.profile && onAuthorClick?.(post.user_id)}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.profile?.avatar_url || ''} />
                <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium hover:text-primary transition-colors">
                  {post.profile?.username || 'მომხმარებელი'}
                  {post.profile?.is_verified && <span className="ml-1 text-primary">✓</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {post.published_at && format(new Date(post.published_at), 'd MMMM, yyyy', { locale: ka })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.reading_time_minutes} წთ
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.views_count}
              </span>
            </div>
          </div>

          {/* Content */}
          <div 
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderContent() }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
              {post.tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Reactions Bar */}
          <div className="flex items-center justify-between mt-8 py-4 border-t border-b border-border">
            <div className="flex items-center gap-4">
              <div 
                className="relative"
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
              >
                <Button
                  variant="ghost"
                  className={post.user_reaction ? 'text-primary' : ''}
                >
                  {post.user_reaction ? reactionEmojis[post.user_reaction] : <Heart className="w-5 h-5 mr-2" />}
                  {!post.user_reaction && 'რეაქცია'}
                  <span className="ml-2">{post.reactions_count || 0}</span>
                </Button>
                
                <AnimatePresence>
                  {showReactions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 10 }}
                      className="absolute bottom-full left-0 mb-2 flex gap-2 p-3 bg-popover rounded-full shadow-lg border border-border z-10"
                    >
                      {Object.entries(reactionEmojis).map(([type, emoji]) => (
                        <button
                          key={type}
                          onClick={() => onReact(post.id, type)}
                          className="text-2xl hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button variant="ghost">
                <MessageCircle className="w-5 h-5 mr-2" />
                კომენტარი
                <span className="ml-2">{post.comments_count || 0}</span>
              </Button>

              <Button variant="ghost">
                <Share2 className="w-5 h-5 mr-2" />
                გაზიარება
              </Button>
            </div>

            <Button 
              variant="ghost"
              onClick={() => onBookmark(post.id)}
              className={post.is_bookmarked ? 'text-primary' : ''}
            >
              <Bookmark className={`w-5 h-5 ${post.is_bookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Comments Section */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">
              კომენტარები ({post.comments_count || 0})
            </h3>

            {/* New Comment */}
            {user && (
              <div className="flex gap-3 mb-6">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {replyTo && (
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      პასუხი კომენტარზე
                      <button 
                        onClick={() => setReplyTo(null)}
                        className="text-primary hover:underline"
                      >
                        გაუქმება
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="დაწერეთ კომენტარი..."
                      className="min-h-[80px] pr-12"
                    />
                    <Button
                      size="icon"
                      className="absolute bottom-2 right-2"
                      onClick={handleSubmitComment}
                      disabled={submittingComment || !newComment.trim()}
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map(comment => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                კომენტარები ჯერ არ არის
              </p>
            )}
          </div>

          {/* Recommended Articles */}
          {recommendations.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h3 className="text-xl font-bold mb-6">შეიძლება მოგეწონოთ</h3>
              <div className="grid gap-4">
                {recommendations.slice(0, 4).map(rec => (
                  <BlogPostCard
                    key={rec.id}
                    post={rec}
                    variant="compact"
                    onReadMore={() => {}}
                    onReact={onReact}
                    onBookmark={onBookmark}
                  />
                ))}
              </div>
            </div>
          )}
        </article>
      </ScrollArea>
    </div>
  );
};

export default BlogArticleView;
