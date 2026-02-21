/**
 * AI Smart Search Results Page
 * Full-page search results with advanced filtering
 */
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  ArrowLeft,
  User,
  Users,
  FileText,
  BookOpen,
  Video,
  Music,
  BarChart3,
  Calendar,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  Hash,
  MessageSquare,
  Radio,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAISmartSearch, SearchResult, SearchCategory, SortOption } from '@/hooks/useAISmartSearch';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface AISearchResultsPageProps {
  initialQuery: string;
  onBack: () => void;
  onUserClick?: (userId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onPostClick?: (postId: string) => void;
  onBlogClick?: (blogId: string) => void;
  onVideoClick?: (videoId: string) => void;
  onMusicClick?: (musicId: string) => void;
  onPollClick?: (pollId: string) => void;
  onEventClick?: (eventId: string) => void;
  onHashtagClick?: (tag: string) => void;
}

const categories: { value: SearchCategory; label: string; icon: typeof User }[] = [
  { value: 'all', label: 'ყველა', icon: Search },
  { value: 'users', label: 'მომხმარებლები', icon: User },
  { value: 'groups', label: 'ჯგუფები', icon: Users },
  { value: 'posts', label: 'პოსტები', icon: FileText },
  { value: 'comments', label: 'კომენტარები', icon: MessageSquare },
  { value: 'hashtags', label: 'ჰეშთეგები', icon: Hash },
  { value: 'blogs', label: 'ბლოგები', icon: BookOpen },
  { value: 'videos', label: 'ვიდეოები', icon: Video },
  { value: 'music', label: 'მუსიკა', icon: Music },
  { value: 'polls', label: 'გამოკითხვები', icon: BarChart3 },
  { value: 'events', label: 'ღონისძიებები', icon: Calendar },
  { value: 'live', label: 'LIVE', icon: Radio },
];

const sortOptions: { value: SortOption; label: string; icon: typeof TrendingUp }[] = [
  { value: 'relevance', label: 'რელევანტურობით', icon: Sparkles },
  { value: 'newest', label: 'უახლესი', icon: Calendar },
  { value: 'popular', label: 'პოპულარული', icon: TrendingUp },
];

const categoryColors: Record<SearchCategory, string> = {
  all: 'bg-muted text-muted-foreground',
  users: 'bg-blue-500/10 text-blue-600',
  groups: 'bg-green-500/10 text-green-600',
  posts: 'bg-orange-500/10 text-orange-600',
  comments: 'bg-slate-500/10 text-slate-600',
  hashtags: 'bg-indigo-500/10 text-indigo-600',
  blogs: 'bg-purple-500/10 text-purple-600',
  videos: 'bg-red-500/10 text-red-600',
  music: 'bg-pink-500/10 text-pink-600',
  polls: 'bg-yellow-500/10 text-yellow-600',
  events: 'bg-cyan-500/10 text-cyan-600',
  live: 'bg-red-500/10 text-red-600',
  messages: 'bg-teal-500/10 text-teal-600',
};

const AISearchResultsPage = ({
  initialQuery,
  onBack,
  onUserClick,
  onGroupClick,
  onPostClick,
  onBlogClick,
  onVideoClick,
  onMusicClick,
  onPollClick,
  onEventClick,
  onHashtagClick,
}: AISearchResultsPageProps) => {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const {
    query,
    results,
    loading,
    category,
    sort,
    hasMore,
    totalCount,
    performSearch,
    setCategory,
    setSort,
    loadMore,
  } = useAISmartSearch();

  useEffect(() => {
    if (initialQuery) {
      setSearchInput(initialQuery);
      performSearch(initialQuery, 'all', 'relevance', 0);
    }
  }, [initialQuery, performSearch]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      performSearch(searchInput, category, sort, 0);
    }
  }, [searchInput, category, sort, performSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    const targetId = result.type === 'users' ? (result.userId || result.id) : result.id;
    
    switch (result.type) {
      case 'users':
        onUserClick?.(targetId);
        break;
      case 'groups':
        onGroupClick?.(targetId);
        break;
      case 'posts':
      case 'comments':
        onPostClick?.(targetId);
        break;
      case 'blogs':
        onBlogClick?.(targetId);
        break;
      case 'videos':
        onVideoClick?.(targetId);
        break;
      case 'music':
        onMusicClick?.(targetId);
        break;
      case 'polls':
        onPollClick?.(targetId);
        break;
      case 'events':
        onEventClick?.(targetId);
        break;
      case 'hashtags':
        onHashtagClick?.(result.title);
        break;
    }
  }, [onUserClick, onGroupClick, onPostClick, onBlogClick, onVideoClick, onMusicClick, onPollClick, onEventClick, onHashtagClick]);

  const getCategoryConfig = (type: SearchCategory) => {
    return categories.find(c => c.value === type) || categories[0];
  };

  const renderResultCard = useCallback((result: SearchResult) => {
    const config = getCategoryConfig(result.type);
    const Icon = config.icon;

    return (
      <motion.div
        key={`${result.type}-${result.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-4 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
        onClick={() => handleResultClick(result)}
      >
        <div className="flex items-start gap-4">
          {/* Image/Icon */}
          <div className="flex-shrink-0">
            {result.imageUrl ? (
              <Avatar className="w-14 h-14 ring-2 ring-background">
                <AvatarImage src={result.imageUrl} alt={result.title} className="object-cover" />
                <AvatarFallback className={categoryColors[result.type]}>
                  <Icon className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${categoryColors[result.type]}`}>
                <Icon className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {result.title}
              </h3>
              {result.isOnline && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
              )}
              {result.isVerified && (
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            
            {result.subtitle && (
              <p className="text-sm text-muted-foreground mb-1">{result.subtitle}</p>
            )}
            
            {result.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <Badge variant="secondary" className={`text-xs ${categoryColors[result.type]}`}>
                {config.label}
              </Badge>
              
              {result.memberCount !== undefined && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {result.memberCount} წევრი
                </span>
              )}
              
              {result.viewCount !== undefined && result.viewCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {result.viewCount} ნახვა
                </span>
              )}
              
              {result.likeCount !== undefined && result.likeCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ❤️ {result.likeCount}
                </span>
              )}
              
              {result.createdAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true, locale: ka })}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [handleResultClick]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Title Bar */}
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold">AI Smart Search</h1>
                <p className="text-[10px] text-muted-foreground">ჭკვიანი ძებნა</p>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ძიება..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-secondary/50 border-0 rounded-xl h-11"
              />
            </div>
          </form>

          {/* Filters */}
          <div className="flex items-center justify-between gap-2">
            <ScrollArea className="flex-1">
              <div className="flex items-center gap-1.5 pb-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = category === cat.value;
                  return (
                    <Button
                      key={cat.value}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCategory(cat.value)}
                      className={`flex-shrink-0 gap-1.5 rounded-xl ${isActive ? '' : 'hover:bg-secondary'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{cat.label}</span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0 gap-1.5 rounded-xl">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {sortOptions.find(s => s.value === sort)?.label}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSort(option.value)}
                      className={`gap-2 ${sort === option.value ? 'bg-secondary' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading && results.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">ძებნა...</span>
            </div>
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">შედეგი ვერ მოიძებნა</h3>
            <p className="text-sm text-muted-foreground mb-6">
              "{query}" - ამ მოთხოვნით არაფერი მოიძებნა
            </p>
            <div className="text-sm text-muted-foreground bg-secondary/50 rounded-xl p-4 max-w-sm mx-auto">
              <p className="font-medium mb-2">💡 რჩევები:</p>
              <ul className="space-y-1 text-left">
                <li>• შეამოწმეთ მართლწერა</li>
                <li>• სცადეთ სხვა საკვანძო სიტყვები</li>
                <li>• გამოიყენეთ უფრო ზოგადი ტერმინები</li>
                <li>• სცადეთ #ჰეშთეგით ძებნა</li>
              </ul>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                ნაპოვნია <span className="font-semibold text-foreground">{totalCount}</span> შედეგი
              </p>
              {query && (
                <Badge variant="secondary" className="text-xs">
                  "{query}"
                </Badge>
              )}
            </div>
            
            {results.map(renderResultCard)}

            {hasMore && (
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  მეტის ჩატვირთვა
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AISearchResultsPage;
