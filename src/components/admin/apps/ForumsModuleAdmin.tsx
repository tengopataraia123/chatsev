import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  MessageSquare,
  Search,
  Trash2,
  Users,
  FileText,
  TrendingUp,
  Loader2,
  BarChart3,
  Eye,
  Ban
} from 'lucide-react';

interface Forum {
  id: string;
  title: string;
  description: string | null;
  category: string;
  user_id: string;
  created_at: string;
  profile?: { username: string; avatar_url: string | null };
  posts_count?: number;
}

interface ForumPost {
  id: string;
  content: string;
  user_id: string;
  forum_id: string;
  created_at: string;
  profile?: { username: string; avatar_url: string | null };
}

interface ForumsModuleAdminProps {
  onBack: () => void;
}

export default function ForumsModuleAdmin({ onBack }: ForumsModuleAdminProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forums, setForums] = useState<Forum[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState({ totalForums: 0, totalPosts: 0, activeToday: 0 });

  const fetchStats = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [forumsRes, postsRes, activeRes] = await Promise.all([
      supabase.from('forums').select('id', { count: 'exact', head: true }),
      supabase.from('forum_posts').select('id', { count: 'exact', head: true }),
      supabase.from('forum_posts').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString())
    ]);

    setStats({
      totalForums: forumsRes.count || 0,
      totalPosts: postsRes.count || 0,
      activeToday: activeRes.count || 0
    });
  }, []);

  const fetchForums = useCallback(async () => {
    const { data } = await supabase
      .from('forums')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map(f => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const forumsWithData = await Promise.all(data.map(async (forum) => {
        const { count } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .eq('forum_id', forum.id);
        
        return {
          ...forum,
          profile: profiles?.find(p => p.user_id === forum.user_id),
          posts_count: count || 0
        };
      }));

      setForums(forumsWithData);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      setPosts(data.map(post => ({
        ...post,
        profile: profiles?.find(p => p.user_id === post.user_id)
      })));
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchForums(), fetchPosts()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchForums, fetchPosts]);

  const handleDeleteForum = async (forumId: string) => {
    if (!confirm('ნამდვილად გსურთ ფორუმის წაშლა?')) return;
    
    await supabase.from('forum_posts').delete().eq('forum_id', forumId);
    await supabase.from('forums').delete().eq('id', forumId);
    
    toast({ title: 'ფორუმი წაიშალა' });
    fetchForums();
    fetchStats();
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('forum_posts').delete().eq('id', postId);
    toast({ title: 'პოსტი წაიშალა' });
    fetchPosts();
    fetchStats();
  };

  const filteredForums = forums.filter(f => 
    f.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = posts.filter(p =>
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            ფორუმების მართვა
          </h2>
          <p className="text-sm text-muted-foreground">მართე ფორუმები და დისკუსიები</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalForums}</p>
              <p className="text-xs text-muted-foreground">ფორუმები</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalPosts}</p>
              <p className="text-xs text-muted-foreground">პოსტები</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeToday}</p>
              <p className="text-xs text-muted-foreground">დღეს</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ძებნა..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="stats" className="flex-1">სტატისტიკა</TabsTrigger>
          <TabsTrigger value="forums" className="flex-1">ფორუმები</TabsTrigger>
          <TabsTrigger value="posts" className="flex-1">პოსტები</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                დეტალური სტატისტიკა
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">სულ ფორუმები</span>
                  <Badge variant="secondary">{stats.totalForums}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">სულ პოსტები</span>
                  <Badge variant="secondary">{stats.totalPosts}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">საშუალო პოსტი/ფორუმი</span>
                  <Badge variant="secondary">
                    {stats.totalForums > 0 ? (stats.totalPosts / stats.totalForums).toFixed(1) : 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forums" className="mt-4">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-2">
              {filteredForums.map(forum => (
                <Card key={forum.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={forum.profile?.avatar_url || ''} />
                        <AvatarFallback>{forum.profile?.username?.[0] || 'F'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{forum.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {forum.profile?.username} • {forum.posts_count} პოსტი
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{forum.category}</Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteForum(forum.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredForums.length === 0 && (
                <p className="text-center text-muted-foreground py-8">ფორუმები არ მოიძებნა</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-2">
              {filteredPosts.map(post => (
                <Card key={post.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.profile?.avatar_url || ''} />
                        <AvatarFallback>{post.profile?.username?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{post.profile?.username}</p>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeletePost(post.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(post.created_at), 'dd.MM.yy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredPosts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">პოსტები არ მოიძებნა</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
