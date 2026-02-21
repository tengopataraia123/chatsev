import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { HashtagMentionText } from '@/components/hashtag';

interface Forum {
  id: string;
  title: string;
  description: string | null;
  category: string;
  user_id: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  posts_count?: number;
}

interface ForumPost {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface ForumsViewProps {
  onBack: () => void;
}

const ForumsView = ({ onBack }: ForumsViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [forums, setForums] = useState<Forum[]>([]);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForums();
  }, []);

  useEffect(() => {
    if (selectedForum) {
      fetchForumPosts(selectedForum.id);
    }
  }, [selectedForum]);

  const fetchForums = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forums')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching forums:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles and post counts
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(f => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const forumsWithProfiles = await Promise.all(data.map(async (forum) => {
        const profile = profiles?.find(p => p.user_id === forum.user_id);
        const { count } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .eq('forum_id', forum.id);
        
        return {
          ...forum,
          profile: profile ? { username: profile.username, avatar_url: profile.avatar_url } : undefined,
          posts_count: count || 0
        };
      }));

      setForums(forumsWithProfiles);
    } else {
      setForums([]);
    }
    setLoading(false);
  };

  const fetchForumPosts = async (forumId: string) => {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('forum_id', forumId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching forum posts:', error);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const postsWithProfiles = data.map(post => ({
        ...post,
        profile: profiles?.find(p => p.user_id === post.user_id)
      }));

      setForumPosts(postsWithProfiles);
    } else {
      setForumPosts([]);
    }
  };

  const handleCreateForum = async () => {
    if (!newTitle.trim() || !user) return;

    const { error } = await supabase
      .from('forums')
      .insert({
        title: newTitle,
        description: newDescription || null,
        user_id: user.id,
        category: 'general'
      });

    if (error) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'ფორუმი შეიქმნა!' });
    setNewTitle('');
    setNewDescription('');
    setShowCreateForm(false);
    fetchForums();
  };

  const handlePostReply = async () => {
    if (!newPostContent.trim() || !user || !selectedForum) return;

    const { error } = await supabase
      .from('forum_posts')
      .insert({
        forum_id: selectedForum.id,
        user_id: user.id,
        content: newPostContent
      });

    if (error) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
      return;
    }

    setNewPostContent('');
    fetchForumPosts(selectedForum.id);
  };

  if (selectedForum) {
    return (
      <div className="flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedForum(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{selectedForum.title}</h1>
            <p className="text-sm text-muted-foreground">{selectedForum.description}</p>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-4 space-y-4">
          {forumPosts.map(post => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.profile?.avatar_url || undefined} />
                    <AvatarFallback>{post.profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{post.profile?.username || 'მომხმარებელი'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                    <HashtagMentionText 
                      content={post.content} 
                      className="mt-2 text-foreground"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex items-end gap-2">
            <Textarea
              value={newPostContent}
              onChange={(e) => {
                setNewPostContent(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostReply();
                }
              }}
              placeholder="დაწერე პასუხი..."
              rows={1}
              className="flex-1 min-h-[44px] max-h-[160px] py-2.5 resize-none overflow-y-auto bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-base leading-6"
              style={{ height: 'auto' }}
            />
            <Button onClick={handlePostReply} disabled={!newPostContent.trim()} className="flex-shrink-0">
              გაგზავნა
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">ფორუმები</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-1" />
          შექმნა
        </Button>
      </div>

      {showCreateForm && (
        <div className="p-4 border-b border-border bg-secondary/30 space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="ფორუმის სათაური"
          />
          <Textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="აღწერა (არასავალდებულო)"
            rows={2}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreateForum} disabled={!newTitle.trim()}>შექმნა</Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>გაუქმება</Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : forums.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>ფორუმები არ მოიძებნა</p>
          </div>
        ) : (
          forums.map(forum => (
            <Card 
              key={forum.id} 
              className="cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => setSelectedForum(forum)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={forum.profile?.avatar_url || undefined} />
                      <AvatarFallback>{forum.profile?.username?.[0]?.toUpperCase() || 'F'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{forum.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{forum.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">{forum.posts_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ForumsView;
