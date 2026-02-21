import { useState, useEffect } from 'react';
import { Search as SearchIcon, X, TrendingUp, Clock, Loader2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SearchViewProps {
  onClose?: () => void;
  onUserClick?: (userId: string) => void;
}

interface UserResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface PostResult {
  id: string;
  content: string | null;
  image_url: string | null;
  user_id: string;
  username: string;
  created_at: string;
}

const trendingTopics = [
  { id: '1', tag: '#საქართველო', posts: '12.5K' },
  { id: '2', tag: '#თბილისი', posts: '8.2K' },
  { id: '3', tag: '#მუსიკა', posts: '5.1K' },
  { id: '4', tag: '#სპორტი', posts: '3.7K' },
  { id: '5', tag: '#ტექნოლოგია', posts: '2.9K' },
];

const SearchView = ({ onClose, onUserClick }: SearchViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setUserResults([]);
      setPostResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(20);

      setUserResults(usersData || []);

      // Search posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, image_url, user_id, created_at')
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsData) {
        // Get usernames for posts
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);

        const profilesMap = new Map<string, string>();
        profilesData?.forEach(p => profilesMap.set(p.user_id, p.username));

        setPostResults(postsData.map(p => ({
          ...p,
          username: profilesMap.get(p.user_id) || 'Unknown',
        })));
      }

      if (query.trim()) {
        saveRecentSearch(query.trim());
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const clearRecentSearch = (search: string) => {
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="ძებნა..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-primary font-medium">
              გაუქმება
            </button>
          )}
        </div>

        {/* Tabs */}
        {searchQuery && (
          <div className="flex gap-4 mt-3">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-2 font-medium transition-colors ${
                activeTab === 'users' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              მომხმარებლები ({userResults.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-2 font-medium transition-colors ${
                activeTab === 'posts' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              პოსტები ({postResults.length})
            </button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!searchQuery && !loading && (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">ბოლო ძებნები</h3>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <button
                        onClick={() => setSearchQuery(search)}
                        className="flex-1 text-left text-muted-foreground"
                      >
                        {search}
                      </button>
                      <button
                        onClick={() => clearRecentSearch(search)}
                        className="p-1 hover:bg-secondary/80 rounded"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Topics */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">ტრენდული</h3>
              </div>
              <div className="space-y-1">
                {trendingTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSearchQuery(topic.tag)}
                    className="w-full text-left px-3 py-3 rounded-lg hover:bg-secondary transition-colors flex items-center justify-between"
                  >
                    <span className="text-primary font-medium">{topic.tag}</span>
                    <span className="text-xs text-muted-foreground">{topic.posts} პოსტი</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Search Results */}
        {searchQuery && !loading && (
          <>
            {activeTab === 'users' && (
              <div className="space-y-2">
                {userResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    მომხმარებელი ვერ მოიძებნა
                  </p>
                ) : (
                  userResults.map((userResult) => (
                    <button
                      key={userResult.user_id}
                      onClick={() => {
                        onUserClick?.(userResult.user_id);
                        onClose?.();
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                        {userResult.avatar_url ? (
                          <img
                            src={userResult.avatar_url}
                            alt={userResult.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{userResult.username}</h4>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="space-y-4">
                {postResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    პოსტი ვერ მოიძებნა
                  </p>
                ) : (
                  postResults.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{post.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString('ka-GE')}
                        </span>
                      </div>
                      {post.content && (
                        <p className="text-sm text-foreground mb-2">{post.content}</p>
                      )}
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full max-h-48 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SearchView;