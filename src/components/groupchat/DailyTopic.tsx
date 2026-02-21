import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, Rss, ThumbsUp, ThumbsDown, Image, Link, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChatColorPicker from './ChatColorPicker';

interface DailyTopicProps {
  isSuperAdmin: boolean;
  userId: string | undefined;
  refreshing?: boolean;
  onRefresh?: () => void;
  ignoredCount?: number;
  onShowIgnoreList?: () => void;
  chatColor?: string;
  onColorChange?: (color: string) => void;
  onStartAddTopic?: (callback: () => void) => void;
  onStartEditTopic?: (callback: () => void) => void;
  onDeleteTopicRequest?: (callback: () => void) => void;
}

interface Topic {
  id: string;
  content: string;
  created_by: string;
  likes_count: number;
  dislikes_count: number;
  image_url?: string | null;
  gif_url?: string | null;
  youtube_url?: string | null;
}

interface ReactionWithUser {
  id: string;
  reaction_type: string;
  user_id: string;
}

// Helper to extract YouTube video ID
const extractYouTubeId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Helper to detect media in content
const detectMedia = (content: string) => {
  const youtubeId = extractYouTubeId(content);
  const imageMatch = content.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i);
  
  return {
    youtubeId,
    imageUrl: imageMatch ? imageMatch[1] : null,
    cleanContent: content
      .replace(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi, '')
      .replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)[^\s]+/gi, '')
      .trim()
  };
};

const DailyTopic = ({ 
  isSuperAdmin, 
  userId,
  refreshing,
  onRefresh,
  ignoredCount = 0,
  onShowIgnoreList,
  chatColor,
  onColorChange,
  onStartAddTopic,
  onStartEditTopic,
  onDeleteTopicRequest
}: DailyTopicProps) => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [reactions, setReactions] = useState<ReactionWithUser[]>([]);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Collapse state persisted per user in localStorage
  const storageKey = userId ? `daily_topic_collapsed_${userId}` : null;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (!storageKey) return false;
    return localStorage.getItem(storageKey) === 'true';
  });

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (storageKey) localStorage.setItem(storageKey, String(next));
      return next;
    });
  }, [storageKey]);

  // Expose the start add topic function - only on mount to avoid infinite loops
  useEffect(() => {
    if (onStartAddTopic && isSuperAdmin) {
      onStartAddTopic(() => {
        setEditContent('');
        setIsEditing(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Delete topic handler (wrapped in useCallback for use in effect)
  const handleDeleteTopic = useCallback(async () => {
    if (!topic || !confirm('წაშალოთ თემა?')) return;

    try {
      await supabase
        .from('group_chat_daily_topics')
        .delete()
        .eq('id', topic.id);
      
      setTopic(null);
      setReactions([]);
      setMyReactions([]);
      toast({ title: 'თემა წაიშალა' });
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  }, [topic, toast]);

  // Expose the start edit topic function - only when topic changes
  useEffect(() => {
    if (onStartEditTopic && isSuperAdmin && topic) {
      onStartEditTopic(() => {
        setEditContent(topic.content);
        setIsEditing(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, topic?.id]);

  // Expose the delete topic function - only when topic changes
  useEffect(() => {
    if (onDeleteTopicRequest && isSuperAdmin && topic) {
      onDeleteTopicRequest(() => {
        handleDeleteTopic();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, topic?.id]);

  const fetchTopic = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('group_chat_daily_topics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setTopic(data);
      
      if (data) {
        // Fetch reactions
        const { data: reactionsData } = await supabase
          .from('group_chat_topic_reactions')
          .select('id, reaction_type, user_id')
          .eq('topic_id', data.id);
        
        if (reactionsData && reactionsData.length > 0) {
          setReactions(reactionsData);
          if (userId) {
            setMyReactions(reactionsData.filter(r => r.user_id === userId).map(r => r.reaction_type));
          }
        } else {
          setReactions([]);
          setMyReactions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const handleReaction = async (reactionType: string) => {
    if (!topic || !userId) return;

    try {
      const hasReaction = myReactions.includes(reactionType);
      
      if (hasReaction) {
        // Remove reaction
        await supabase
          .from('group_chat_topic_reactions')
          .delete()
          .eq('topic_id', topic.id)
          .eq('user_id', userId)
          .eq('reaction_type', reactionType);
        
        setMyReactions(prev => prev.filter(r => r !== reactionType));
        setReactions(prev => prev.filter(r => !(r.user_id === userId && r.reaction_type === reactionType)));
      } else {
        // Add reaction
        const { data: newReaction } = await supabase
          .from('group_chat_topic_reactions')
          .insert({
            topic_id: topic.id,
            user_id: userId,
            reaction_type: reactionType
          })
          .select()
          .single();
        
        if (newReaction) {
          setMyReactions(prev => [...prev, reactionType]);
          setReactions(prev => [...prev, newReaction]);
        }
      }
    } catch (error) {
      console.error('Error reacting:', error);
      toast({
        title: 'შეცდომა',
        description: 'რეაქციის დამატება ვერ მოხერხდა',
        variant: 'destructive'
      });
    }
  };

  const handleSaveTopic = async () => {
    if (!editContent.trim()) return;

    try {
      if (topic) {
        await supabase
          .from('group_chat_daily_topics')
          .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
          .eq('id', topic.id);
      } else {
        await supabase
          .from('group_chat_daily_topics')
          .insert({
            content: editContent.trim(),
            created_by: userId!
          });
      }
      
      setIsEditing(false);
      fetchTopic();
      toast({ title: 'თემა შენახულია' });
    } catch (error) {
      console.error('Error saving topic:', error);
      toast({
        title: 'შეცდომა',
        description: 'თემის შენახვა ვერ მოხერხდა',
        variant: 'destructive'
      });
    }
  };

  // Calculate like/dislike counts
  const likeCount = reactions.filter(r => r.reaction_type === 'like').length;
  const dislikeCount = reactions.filter(r => r.reaction_type === 'dislike').length;
  const userLiked = myReactions.includes('like');
  const userDisliked = myReactions.includes('dislike');

  // Parse media from content
  const media = topic ? detectMedia(topic.content) : null;

  if (loading) {
    return (
      <div className="px-3 py-3 border-b border-border bg-card animate-pulse">
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="px-3 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Rss className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="font-medium text-foreground">დღის თემა:</span>
        </div>
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="შეიყვანეთ დღის თემა... (შეგიძლიათ დაამატოთ YouTube ლინკი ან სურათის URL)"
          className="mb-3 min-h-[80px] text-sm rounded-xl"
          autoFocus
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Image className="w-3.5 h-3.5" />
          <span>სურათი</span>
          <Link className="w-3.5 h-3.5 ml-2" />
          <span>YouTube</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-9 text-sm px-4 rounded-lg" onClick={handleSaveTopic}>შენახვა</Button>
          <Button size="sm" variant="outline" className="h-9 text-sm px-4 rounded-lg" onClick={() => setIsEditing(false)}>გაუქმება</Button>
        </div>
      </div>
    );
  }

  // Show controls row even when there's no topic
  if (!topic) {
    return (
      <div className="px-3 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleCollapsed}>
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Rss className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="font-medium text-foreground">დღის თემა</span>
          {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
          
        </div>
        {!isCollapsed && <p className="text-sm text-muted-foreground mt-2">დღის თემა ჯერ არ არის დამატებული</p>}
      </div>
    );
  }

  return (
    <div className="px-3 py-3 border-b border-border bg-card">
      {/* Header with toggle */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={toggleCollapsed}>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <Rss className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="font-medium text-foreground">დღის თემა</span>
        {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        
      </div>
      
      {/* Collapsible Topic Card */}
      {!isCollapsed && (
        <div className="mt-3 relative bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/20 rounded-xl border-l-4 border-primary overflow-hidden">
          {media?.youtubeId && (
            <div className="w-full aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${media.youtubeId}`}
                title="YouTube video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          
          {media?.imageUrl && !media.youtubeId && (
            <div className="w-full">
              <img 
                src={media.imageUrl} 
                alt="Topic media" 
                className="w-full max-h-48 object-cover"
              />
            </div>
          )}
          
          <div className="p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {media?.cleanContent || topic.content}
            </p>
            
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  userLiked 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-secondary/80 text-foreground hover:bg-secondary'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>({likeCount})</span>
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={() => handleReaction('dislike')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  userDisliked 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-secondary/80 text-foreground hover:bg-secondary'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>({dislikeCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTopic;
