import { useEffect, useState } from 'react';
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
import { useGlobalSearch, SearchResult, SearchCategory, SortOption } from '@/hooks/useGlobalSearch';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface SearchResultsPageProps {
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
}

const categories: { value: SearchCategory; label: string; icon: typeof User }[] = [
  { value: 'all', label: 'ყველა', icon: Search },
  { value: 'users', label: 'მომხმარებლები', icon: User },
  { value: 'groups', label: 'ჯგუფები', icon: Users },
  { value: 'posts', label: 'პოსტები', icon: FileText },
  { value: 'blogs', label: 'ბლოგები', icon: BookOpen },
  { value: 'videos', label: 'ვიდეოები', icon: Video },
  { value: 'music', label: 'მუსიკა', icon: Music },
  { value: 'polls', label: 'გამოკითხვები', icon: BarChart3 },
  { value: 'events', label: 'ღონისძიებები', icon: Calendar },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'რელევანტურობით' },
  { value: 'newest', label: 'უახლესი' },
  { value: 'popular', label: 'პოპულარული' },
];

const categoryColors: Record<SearchCategory, string> = {
  all: 'bg-muted text-muted-foreground',
  users: 'bg-blue-500/10 text-blue-600',
  groups: 'bg-green-500/10 text-green-600',
  posts: 'bg-orange-500/10 text-orange-600',
  blogs: 'bg-purple-500/10 text-purple-600',
  videos: 'bg-red-500/10 text-red-600',
  music: 'bg-pink-500/10 text-pink-600',
  polls: 'bg-yellow-500/10 text-yellow-600',
  events: 'bg-cyan-500/10 text-cyan-600',
};

const SearchResultsPage = ({
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
}: SearchResultsPageProps) => {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const {
    query,
    results,
    loading,
    category,
    sort,
    hasMore,
    performSearch,
    setCategory,
    setSort,
    loadMore,
  } = useGlobalSearch();

  useEffect(() => {
    if (initialQuery) {
      setSearchInput(initialQuery);
      performSearch(initialQuery, 'all', 'relevance', 0);
    }
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      performSearch(searchInput, category, sort, 0);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'users':
        onUserClick?.(result.id);
        break;
      case 'groups':
        onGroupClick?.(result.id);
        break;
      case 'posts':
        onPostClick?.(result.id);
        break;
      case 'blogs':
        onBlogClick?.(result.id);
        break;
      case 'videos':
        onVideoClick?.(result.id);
        break;
      case 'music':
        onMusicClick?.(result.id);
        break;
      case 'polls':
        onPollClick?.(result.id);
        break;
      case 'events':
        onEventClick?.(result.id);
        break;
    }
  };

  const getCategoryConfig = (type: SearchCategory) => {
    const found = categories.find(c => c.value === type);
    return found || categories[0];
  };

  const renderResultCard = (result: SearchResult) => {
    const config = getCategoryConfig(result.type);
    const Icon = config.icon;

    return (
      <motion.div
        key={`${result.type}-${result.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer group"
        onClick={() => handleResultClick(result)}
      >
        <div className="flex items-start gap-4">
          {/* Image/Icon */}
          <div className="flex-shrink-0">
            {result.imageUrl ? (
              <Avatar className="w-14 h-14">
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
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              )}
            </div>
            
            {result.subtitle && (
              <p className="text-sm text-muted-foreground mb-1">{result.subtitle}</p>
            )}
            
            {result.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant="secondary" className={`text-xs ${categoryColors[result.type]}`}>
                {config.label}
              </Badge>
              
              {result.memberCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {result.memberCount} წევრი
                </span>
              )}
              
              {result.viewCount !== undefined && result.viewCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {result.viewCount} ნახვა
                </span>
              )}
              
              {result.likeCount !== undefined && result.likeCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {result.likeCount} მოწონება
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ძიება..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 bg-secondary/50 border-0"
                />
              </div>
            </form>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between gap-2">
            <ScrollArea className="flex-1">
              <div className="flex items-center gap-2 pb-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = category === cat.value;
                  return (
                    <Button
                      key={cat.value}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCategory(cat.value)}
                      className={`flex-shrink-0 gap-1.5 ${isActive ? '' : 'hover:bg-secondary'}`}
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
                <Button variant="outline" size="sm" className="flex-shrink-0 gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {sortOptions.find(s => s.value === sort)?.label}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSort(option.value)}
                    className={sort === option.value ? 'bg-secondary' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading && results.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">შედეგი ვერ მოიძებნა</h3>
            <p className="text-sm text-muted-foreground mb-4">
              "{query}" - ამ მოთხოვნით არაფერი მოიძებნა
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">შესაძლოა ეძებდით:</p>
              <ul className="space-y-1">
                <li>• შეამოწმეთ მართლწერა</li>
                <li>• სცადეთ სხვა საკვანძო სიტყვები</li>
                <li>• გამოიყენეთ უფრო ზოგადი ტერმინები</li>
              </ul>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              ნაპოვნია {results.length} შედეგი "{query}"
            </p>
            
            {results.map(renderResultCard)}

            {hasMore && (
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full"
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

export default SearchResultsPage;
