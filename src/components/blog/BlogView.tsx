import { useState, memo, useCallback } from 'react';
import { Search, Plus, Filter, TrendingUp, Clock, Star, Loader2, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useBlogPosts } from './hooks/useBlogPosts';
import { useBlogRecommendations } from './hooks/useBlogRecommendations';
import BlogPostCard from './BlogPostCard';
import BlogArticleView from './BlogArticleView';
import CreateBlogModal from './CreateBlogModal';
import { BlogPost } from './types';
import { motion } from 'framer-motion';

interface BlogViewProps {
  onUserClick?: (userId: string) => void;
}

const BlogView = memo(({ onUserClick }: BlogViewProps) => {
  const { user, profile } = useAuth();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('latest');

  const {
    posts,
    featuredPosts,
    popularPosts,
    categories,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    createPost,
    reactToPost,
    bookmarkPost,
  } = useBlogPosts();

  const { recommendations } = useBlogRecommendations();

  // Check if user can create posts (all logged in users can create)
  const canCreatePost = !!user;

  if (selectedPost) {
    return (
      <BlogArticleView
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
        onReact={reactToPost}
        onBookmark={bookmarkPost}
        onAuthorClick={onUserClick}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">ბლოგი</h1>
          </div>
          {canCreatePost && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              ახალი სტატია
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძიება სტატიებში..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <ScrollArea className="pb-4">
          <div className="flex gap-2 px-4">
            <Badge
              variant={selectedCategory === null ? 'default' : 'secondary'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(null)}
            >
              ყველა
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'secondary'}
                className="cursor-pointer whitespace-nowrap"
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 space-y-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Featured Posts */}
              {featuredPosts.length > 0 && !selectedCategory && !searchQuery && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-bold">რჩეული სტატიები</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {featuredPosts.map((post, idx) => (
                      <BlogPostCard
                        key={post.id}
                        post={post}
                        variant={idx === 0 ? 'featured' : 'default'}
                        onReadMore={setSelectedPost}
                        onReact={reactToPost}
                        onBookmark={bookmarkPost}
                        onAuthorClick={onUserClick}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Tabs for Latest, Popular, Recommended */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="latest" className="text-xs sm:text-sm">
                    <Clock className="w-4 h-4 mr-1 sm:mr-2" />
                    უახლესი
                  </TabsTrigger>
                  <TabsTrigger value="popular" className="text-xs sm:text-sm">
                    <TrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
                    პოპულარული
                  </TabsTrigger>
                  <TabsTrigger value="recommended" className="text-xs sm:text-sm">
                    <Star className="w-4 h-4 mr-1 sm:mr-2" />
                    თქვენთვის
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="latest" className="mt-4">
                  {posts.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {posts.map(post => (
                        <BlogPostCard
                          key={post.id}
                          post={post}
                          onReadMore={setSelectedPost}
                          onReact={reactToPost}
                          onBookmark={bookmarkPost}
                          onAuthorClick={onUserClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">სტატიები ვერ მოიძებნა</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="popular" className="mt-4">
                  {popularPosts.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {popularPosts.map(post => (
                        <BlogPostCard
                          key={post.id}
                          post={post}
                          onReadMore={setSelectedPost}
                          onReact={reactToPost}
                          onBookmark={bookmarkPost}
                          onAuthorClick={onUserClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">პოპულარული სტატიები ჯერ არ არის</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="recommended" className="mt-4">
                  {recommendations.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.map(post => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="relative">
                            {post.recommendation_reason && (
                              <Badge className="absolute -top-2 left-4 z-10 text-xs">
                                {post.recommendation_reason}
                              </Badge>
                            )}
                            <BlogPostCard
                              post={post}
                              onReadMore={setSelectedPost}
                              onReact={reactToPost}
                              onBookmark={bookmarkPost}
                              onAuthorClick={onUserClick}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {user ? 'წაიკითხეთ რამდენიმე სტატია პერსონალიზებული რეკომენდაციებისთვის' : 'გაიარეთ ავტორიზაცია რეკომენდაციებისთვის'}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Create Blog Modal */}
      <CreateBlogModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        categories={categories}
        onSubmit={createPost}
      />
    </div>
  );
});

BlogView.displayName = 'BlogView';

export default BlogView;
