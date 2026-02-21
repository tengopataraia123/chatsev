import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2, Search, Check, X, Eye, Trash2, Pin, Star, Plus, Edit, Newspaper, TrendingUp, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  cover_url?: string;
  status: string;
  is_featured: boolean;
  is_pinned: boolean;
  views_count: number;
  created_at: string;
  published_at?: string;
  user_id: string;
  category?: { name: string; color: string };
  profile?: { username: string; avatar_url?: string };
  reactions_count?: number;
  comments_count?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface BlogModuleAdminProps {
  onBack: () => void;
}

const BlogModuleAdmin = ({ onBack }: BlogModuleAdminProps) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalViews: 0,
    totalReactions: 0,
  });
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', color: '#8B5CF6' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch posts based on active tab
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(name, color)
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      } else if (activeTab === 'approved') {
        query = query.eq('status', 'approved');
      } else if (activeTab === 'rejected') {
        query = query.eq('status', 'rejected');
      }

      const { data: postsData, error: postsError } = await query;
      if (postsError) throw postsError;

      // Fetch profiles
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      // Enrich posts with stats
      const enrichedPosts = await Promise.all(
        (postsData || []).map(async (post) => {
          const { count: reactionsCount } = await supabase
            .from('blog_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('blog_id', post.id);

          const { count: commentsCount } = await supabase
            .from('blog_comments')
            .select('*', { count: 'exact', head: true })
            .eq('blog_id', post.id);

          return {
            ...post,
            profile: profileMap.get(post.user_id),
            reactions_count: reactionsCount || 0,
            comments_count: commentsCount || 0,
          };
        })
      );

      setPosts(enrichedPosts);

      // Fetch categories
      const { data: catsData } = await supabase
        .from('blog_categories')
        .select('*')
        .order('sort_order');
      
      setCategories(catsData || []);

      // Fetch stats
      const { count: totalCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: approvedCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { data: viewsData } = await supabase
        .from('blog_posts')
        .select('views_count');

      const totalViews = viewsData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      setStats({
        total: totalCount || 0,
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        totalViews,
        totalReactions: enrichedPosts.reduce((sum, p) => sum + (p.reactions_count || 0), 0),
      });

    } catch (error) {
      console.error('Error fetching blog data:', error);
      toast.error('შეცდომა მონაცემების ჩატვირთვისას');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      toast.success('სტატია დამტკიცებულია');
      setSelectedPost(null);
      fetchData();
    } catch (error) {
      console.error('Error approving post:', error);
      toast.error('შეცდომა დამტკიცებისას');
    }
  };

  const handleReject = async (postId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('გთხოვთ მიუთითოთ უარყოფის მიზეზი');
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('id', postId);

      if (error) throw error;

      toast.success('სტატია უარყოფილია');
      setSelectedPost(null);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      console.error('Error rejecting post:', error);
      toast.error('შეცდომა უარყოფისას');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('სტატია წაიშალა');
      fetchData();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('შეცდომა წაშლისას');
    }
  };

  const handleToggleFeatured = async (postId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ is_featured: !currentValue })
        .eq('id', postId);

      if (error) throw error;

      toast.success(currentValue ? 'რჩეული მოიხსნა' : 'დაემატა რჩეულებში');
      fetchData();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const handleTogglePinned = async (postId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ is_pinned: !currentValue })
        .eq('id', postId);

      if (error) throw error;

      toast.success(currentValue ? 'მიმაგრება მოიხსნა' : 'სტატია მიმაგრებულია');
      fetchData();
    } catch (error) {
      console.error('Error toggling pinned:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('შეიყვანეთ კატეგორიის სახელი');
      return;
    }

    try {
      const slug = newCategory.slug || newCategory.name.toLowerCase().replace(/\s+/g, '-');

      const { error } = await supabase
        .from('blog_categories')
        .insert({
          name: newCategory.name,
          slug,
          color: newCategory.color,
          sort_order: categories.length,
        });

      if (error) throw error;

      toast.success('კატეგორია დაემატა');
      setShowCategoryModal(false);
      setNewCategory({ name: '', slug: '', color: '#8B5CF6' });
      fetchData();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('შეცდომა კატეგორიის დამატებისას');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;

    try {
      const { error } = await supabase
        .from('blog_categories')
        .delete()
        .eq('id', catId);

      if (error) throw error;

      toast.success('კატეგორია წაიშალა');
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('შეცდომა კატეგორიის წაშლისას');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" />
            ბლოგის მართვა
          </h2>
          <p className="text-muted-foreground">მართე სტატიები და კატეგორიები</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">სულ სტატიები</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">მოლოდინში</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            <p className="text-sm text-muted-foreground">გამოქვეყნებული</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalViews}</p>
            <p className="text-sm text-muted-foreground">ნახვები</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalReactions}</p>
            <p className="text-sm text-muted-foreground">რეაქციები</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ძიება სათაურით ან ავტორით..."
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            მოლოდინში ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved">გამოქვეყნებული</TabsTrigger>
          <TabsTrigger value="rejected">უარყოფილი</TabsTrigger>
          <TabsTrigger value="categories">კატეგორიები</TabsTrigger>
        </TabsList>

        {/* Posts Tabs */}
        {['pending', 'approved', 'rejected'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map(post => (
                    <Card key={post.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {post.cover_url && (
                            <img
                              src={post.cover_url}
                              alt={post.title}
                              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium line-clamp-1">{post.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={post.profile?.avatar_url || ''} />
                                    <AvatarFallback className="text-xs">
                                      {post.profile?.username?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">
                                    {post.profile?.username}
                                  </span>
                                  {post.category && (
                                    <Badge style={{ backgroundColor: post.category.color }}>
                                      {post.category.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {tab === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedPost(post)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleApprove(post.id)}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setSelectedPost(post)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                {tab === 'approved' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant={post.is_featured ? 'default' : 'outline'}
                                      onClick={() => handleToggleFeatured(post.id, post.is_featured)}
                                    >
                                      <Star className={`w-4 h-4 ${post.is_featured ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={post.is_pinned ? 'default' : 'outline'}
                                      onClick={() => handleTogglePinned(post.id, post.is_pinned)}
                                    >
                                      <Pin className={`w-4 h-4 ${post.is_pinned ? 'fill-current' : ''}`} />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDelete(post.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {post.excerpt || post.content.substring(0, 150)}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.views_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {post.reactions_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {post.comments_count}
                              </span>
                              <span>
                                {format(new Date(post.created_at), 'd MMM, yyyy', { locale: ka })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    სტატიები არ მოიძებნა
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowCategoryModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              ახალი კატეგორია
            </Button>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {categories.map(cat => (
                <Card key={cat.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium">{cat.name}</span>
                      <Badge variant="secondary">{cat.slug}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Post Preview/Reject Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              {selectedPost.cover_url && (
                <img
                  src={selectedPost.cover_url}
                  alt={selectedPost.title}
                  className="w-full aspect-video object-cover rounded-lg"
                />
              )}
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedPost.profile?.avatar_url || ''} />
                  <AvatarFallback>
                    {selectedPost.profile?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{selectedPost.profile?.username}</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {selectedPost.content}
              </div>

              {selectedPost.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">უარყოფის მიზეზი</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="მიუთითეთ მიზეზი..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedPost.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      უარყოფა
                    </Button>
                    <Button onClick={() => handleApprove(selectedPost.id)}>
                      <Check className="w-4 h-4 mr-2" />
                      დამტკიცება
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ახალი კატეგორია</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">სახელი</label>
              <Input
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="კატეგორიის სახელი"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={newCategory.slug}
                onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                placeholder="category-slug"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ფერი</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
                გაუქმება
              </Button>
              <Button onClick={handleAddCategory}>
                დამატება
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogModuleAdmin;
