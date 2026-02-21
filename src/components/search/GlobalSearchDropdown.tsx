import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  User,
  Users,
  FileText,
  BookOpen,
  Video,
  Music,
  BarChart3,
  Calendar,
  Loader2,
  Clock,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGlobalSearch, SearchResult, SearchCategory, getRecentSearches, clearRecentSearch } from '@/hooks/useGlobalSearch';

interface GlobalSearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onPostClick?: (postId: string) => void;
  onBlogClick?: (blogId: string) => void;
  onVideoClick?: (videoId: string) => void;
  onMusicClick?: (musicId: string) => void;
  onPollClick?: (pollId: string) => void;
  onEventClick?: (eventId: string) => void;
  onViewAllResults?: (query: string) => void;
}

const categoryConfig: Record<SearchCategory, { icon: typeof User; label: string; color: string }> = {
  all: { icon: Search, label: 'ყველა', color: 'bg-muted' },
  users: { icon: User, label: 'მომხმარებლები', color: 'bg-blue-500/10 text-blue-500' },
  groups: { icon: Users, label: 'ჯგუფები', color: 'bg-green-500/10 text-green-500' },
  posts: { icon: FileText, label: 'პოსტები', color: 'bg-orange-500/10 text-orange-500' },
  blogs: { icon: BookOpen, label: 'ბლოგები', color: 'bg-purple-500/10 text-purple-500' },
  videos: { icon: Video, label: 'ვიდეოები', color: 'bg-red-500/10 text-red-500' },
  music: { icon: Music, label: 'მუსიკა', color: 'bg-pink-500/10 text-pink-500' },
  polls: { icon: BarChart3, label: 'გამოკითხვები', color: 'bg-yellow-500/10 text-yellow-500' },
  events: { icon: Calendar, label: 'ღონისძიებები', color: 'bg-cyan-500/10 text-cyan-500' },
};

const trendingTopics = [
  { tag: '#საქართველო', posts: '12.5K' },
  { tag: '#თბილისი', posts: '8.2K' },
  { tag: '#მუსიკა', posts: '5.1K' },
  { tag: '#სპორტი', posts: '3.7K' },
];

const GlobalSearchDropdown = ({
  isOpen,
  onClose,
  onUserClick,
  onGroupClick,
  onPostClick,
  onBlogClick,
  onVideoClick,
  onMusicClick,
  onPollClick,
  onEventClick,
  onViewAllResults,
}: GlobalSearchDropdownProps) => {
  const [inputValue, setInputValue] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { query, results, loading, performSearch, clearSearch } = useGlobalSearch();

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (inputValue.trim()) {
        performSearch(inputValue, 'all', 'relevance', 0);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [inputValue, performSearch, clearSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside dropdown
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };

    if (isOpen) {
      // Small delay to avoid closing on the same click that opened
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onClose]);

  const handleResultClick = (result: SearchResult) => {
    // Get the userId before closing
    const targetUserId = result.type === 'users' ? (result.userId || result.id) : result.id;
    const resultType = result.type;
    
    console.log('[GlobalSearch] Result clicked:', { resultType, targetUserId, result });
    
    // Close dropdown first
    onClose();
    
    // Navigate immediately
    console.log('[GlobalSearch] Navigating to:', resultType, targetUserId);
    switch (resultType) {
      case 'users':
        if (targetUserId && onUserClick) {
          console.log('[GlobalSearch] Calling onUserClick with:', targetUserId);
          onUserClick(targetUserId);
        }
        break;
      case 'groups':
        onGroupClick?.(targetUserId);
        break;
      case 'posts':
        onPostClick?.(targetUserId);
        break;
      case 'blogs':
        onBlogClick?.(targetUserId);
        break;
      case 'videos':
        onVideoClick?.(targetUserId);
        break;
      case 'music':
        onMusicClick?.(targetUserId);
        break;
      case 'polls':
        onPollClick?.(targetUserId);
        break;
      case 'events':
        onEventClick?.(targetUserId);
        break;
    }
  };

  const handleRecentSearch = (search: string) => {
    setInputValue(search);
    performSearch(search, 'all', 'relevance', 0);
  };

  const handleClearRecent = (search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearch(search);
    setRecentSearches(prev => prev.filter(s => s !== search));
  };

  const handleViewAll = () => {
    if (inputValue.trim()) {
      onViewAllResults?.(inputValue);
      onClose();
    }
  };

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchCategory, SearchResult[]>);

  const renderResultItem = (result: SearchResult) => {
    const config = categoryConfig[result.type];
    const Icon = config.icon;

    const handleClick = () => {
      console.log('[GlobalSearch] Item clicked:', result.type, result.id);
      handleResultClick(result);
    };

    return (
      <div
        key={`${result.type}-${result.id}`}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/80 active:bg-secondary transition-colors text-left group cursor-pointer select-none"
      >
        <div className="flex-shrink-0 pointer-events-none">
          {result.imageUrl ? (
            <Avatar className="w-10 h-10">
              <AvatarImage src={result.imageUrl} alt={result.title} className="object-cover" />
              <AvatarFallback className="bg-secondary">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{result.title}</span>
            {result.isOnline && (
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            )}
          </div>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 flex-shrink-0 pointer-events-none">
          {config.label}
        </Badge>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-[70vh] flex flex-col"
        >
          {/* Search Input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="ძიება მომხმარებლები, ჯგუფები, პოსტები..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-10 pr-10 bg-secondary/50 border-0 focus-visible:ring-1"
              />
              {inputValue && (
                <button
                  onClick={() => {
                    setInputValue('');
                    clearSearch();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && !inputValue && (
              <div className="p-3 space-y-4">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">ბოლო ძებნები</span>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.slice(0, 5).map((search, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer group"
                          onClick={() => handleRecentSearch(search)}
                        >
                          <span className="text-sm text-muted-foreground">{search}</span>
                          <button
                            onClick={(e) => handleClearRecent(search, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-secondary rounded transition-all"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending */}
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">ტრენდული</span>
                  </div>
                  <div className="space-y-1">
                    {trendingTopics.map((topic, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInputValue(topic.tag);
                          performSearch(topic.tag, 'all', 'relevance', 0);
                        }}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                      >
                        <span className="text-sm text-primary font-medium">{topic.tag}</span>
                        <span className="text-[10px] text-muted-foreground">{topic.posts} პოსტი</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!loading && inputValue && results.length === 0 && (
              <div className="py-8 text-center">
                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">შედეგი ვერ მოიძებნა</p>
                <p className="text-xs text-muted-foreground mt-1">სცადეთ სხვა საძიებო სიტყვა</p>
              </div>
            )}

            {!loading && inputValue && results.length > 0 && (
              <div className="p-2 space-y-3">
                {Object.entries(groupedResults).map(([category, items]) => {
                  if (items.length === 0) return null;
                  const config = categoryConfig[category as SearchCategory];
                  const Icon = config.icon;

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                      </div>
                      <div className="space-y-0.5">
                        {items.slice(0, 3).map(renderResultItem)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* View All Results */}
          {inputValue && results.length > 0 && (
            <div className="p-2 border-t border-border">
              <button
                onClick={handleViewAll}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                ყველა შედეგის ნახვა
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalSearchDropdown;
