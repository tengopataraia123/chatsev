/**
 * AI Smart Search Dropdown - Universal Platform Search UI
 * Features: Real-time search, suggestions, trending, categories
 */
import { useEffect, useRef, useState, useCallback, memo } from 'react';
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
  Hash,
  MessageSquare,
  Radio,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useAISmartSearch, 
  SearchResult, 
  SearchCategory, 
  getRecentSearches, 
  clearRecentSearch,
  clearAllRecentSearches 
} from '@/hooks/useAISmartSearch';

interface AISearchDropdownProps {
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
  onHashtagClick?: (tag: string) => void;
  onViewAllResults?: (query: string) => void;
}

const categoryConfig: Record<SearchCategory, { icon: typeof User; label: string; color: string }> = {
  all: { icon: Search, label: 'ყველა', color: 'bg-muted' },
  users: { icon: User, label: 'მომხმარებლები', color: 'bg-blue-500/10 text-blue-500' },
  groups: { icon: Users, label: 'ჯგუფები', color: 'bg-green-500/10 text-green-500' },
  posts: { icon: FileText, label: 'პოსტები', color: 'bg-orange-500/10 text-orange-500' },
  comments: { icon: MessageSquare, label: 'კომენტარები', color: 'bg-slate-500/10 text-slate-500' },
  hashtags: { icon: Hash, label: 'ჰეშთეგები', color: 'bg-indigo-500/10 text-indigo-500' },
  blogs: { icon: BookOpen, label: 'ბლოგები', color: 'bg-purple-500/10 text-purple-500' },
  videos: { icon: Video, label: 'ვიდეოები', color: 'bg-red-500/10 text-red-500' },
  music: { icon: Music, label: 'მუსიკა', color: 'bg-pink-500/10 text-pink-500' },
  polls: { icon: BarChart3, label: 'გამოკითხვები', color: 'bg-yellow-500/10 text-yellow-500' },
  events: { icon: Calendar, label: 'ღონისძიებები', color: 'bg-cyan-500/10 text-cyan-500' },
  live: { icon: Radio, label: 'LIVE', color: 'bg-red-500/10 text-red-500' },
  messages: { icon: MessageSquare, label: 'შეტყობინებები', color: 'bg-teal-500/10 text-teal-500' },
};

const AISearchDropdown = memo(({
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
  onHashtagClick,
  onViewAllResults,
}: AISearchDropdownProps) => {
  const [inputValue, setInputValue] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    results, 
    loading, 
    performSearch, 
    clearSearch,
    trendingHashtags,
    fetchTrendingHashtags,
    suggestions,
    generateSuggestions,
  } = useAISmartSearch();

  // Load recent searches and trending on open
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      fetchTrendingHashtags();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setInputValue('');
      clearSearch();
    }
  }, [isOpen, fetchTrendingHashtags, clearSearch]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (inputValue.trim().length >= 2) {
        performSearch(inputValue, 'all', 'relevance', 0);
        generateSuggestions(inputValue);
      } else {
        clearSearch();
      }
    }, 250);

    return () => clearTimeout(debounce);
  }, [inputValue, performSearch, clearSearch, generateSuggestions]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };

    if (isOpen) {
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

  const handleResultClick = useCallback((result: SearchResult) => {
    const targetId = result.type === 'users' ? (result.userId || result.id) : result.id;
    
    onClose();
    
    switch (result.type) {
      case 'users':
        if (targetId && onUserClick) onUserClick(targetId);
        break;
      case 'groups':
        onGroupClick?.(targetId);
        break;
      case 'posts':
      case 'comments':
        onPostClick?.(result.type === 'comments' ? targetId : targetId);
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
  }, [onClose, onUserClick, onGroupClick, onPostClick, onBlogClick, onVideoClick, onMusicClick, onPollClick, onEventClick, onHashtagClick]);

  const handleRecentSearch = useCallback((search: string) => {
    setInputValue(search);
    performSearch(search, 'all', 'relevance', 0);
  }, [performSearch]);

  const handleClearRecent = useCallback((search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearch(search);
    setRecentSearches(prev => prev.filter(s => s !== search));
  }, []);

  const handleHashtagClick = useCallback((tag: string) => {
    setInputValue(tag);
    performSearch(tag, 'all', 'relevance', 0);
  }, [performSearch]);

  const handleViewAll = useCallback(() => {
    if (inputValue.trim()) {
      onViewAllResults?.(inputValue);
      onClose();
    }
  }, [inputValue, onViewAllResults, onClose]);

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchCategory, SearchResult[]>);

  const renderResultItem = useCallback((result: SearchResult) => {
    const config = categoryConfig[result.type];
    const Icon = config.icon;

    return (
      <div
        key={`${result.type}-${result.id}`}
        role="button"
        tabIndex={0}
        onClick={() => handleResultClick(result)}
        onKeyDown={(e) => e.key === 'Enter' && handleResultClick(result)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/80 active:bg-secondary transition-all text-left group cursor-pointer select-none"
      >
        <div className="flex-shrink-0">
          {result.imageUrl ? (
            <Avatar className="w-10 h-10 ring-2 ring-background">
              <AvatarImage src={result.imageUrl} alt={result.title} className="object-cover" />
              <AvatarFallback className={config.color}>
                <Icon className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {result.title}
            </span>
            {result.isOnline && (
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
            )}
            {result.isVerified && (
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
          )}
        </div>
        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${config.color}`}>
          {config.label}
        </Badge>
      </div>
    );
  }, [handleResultClick]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[75vh] flex flex-col"
        >
          {/* AI Search Header */}
          <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI Smart Search</h3>
                <p className="text-[10px] text-muted-foreground">ჭკვიანი ძებნა მთელ პლატფორმაზე</p>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="ძებნა მომხმარებლები, პოსტები, ჯგუფები, #ჰეშთეგები..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-10 pr-10 bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl h-11"
              />
              {inputValue && (
                <button
                  onClick={() => {
                    setInputValue('');
                    clearSearch();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && inputValue && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentSearch(suggestion)}
                    className="px-2.5 py-1 text-xs bg-secondary/70 hover:bg-secondary rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-3">
              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">ძებნა...</span>
                  </div>
                </div>
              )}

              {/* Empty State - Show Recent & Trending */}
              {!loading && !inputValue && (
                <div className="space-y-5">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">ბოლო ძებნები</span>
                        </div>
                        <button
                          onClick={() => {
                            clearAllRecentSearches();
                            setRecentSearches([]);
                          }}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          წაშლა
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {recentSearches.slice(0, 5).map((search, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/80 transition-colors cursor-pointer group"
                            onClick={() => handleRecentSearch(search)}
                          >
                            <div className="flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{search}</span>
                            </div>
                            <button
                              onClick={(e) => handleClearRecent(search, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded-full transition-all"
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Hashtags */}
                  {trendingHashtags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">ტრენდული</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {trendingHashtags.slice(0, 8).map((item, i) => (
                          <button
                            key={i}
                            onClick={() => handleHashtagClick(item.tag)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
                          >
                            <span className="text-sm font-medium text-primary truncate">{item.tag}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">{item.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Categories */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">კატეგორიები</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['users', 'groups', 'posts', 'videos', 'music', 'live'] as SearchCategory[]).map((cat) => {
                        const config = categoryConfig[cat];
                        const Icon = config.icon;
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              setInputValue(` `);
                              performSearch(' ', cat, 'popular', 0);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color} hover:opacity-80 transition-opacity`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!loading && inputValue && results.length === 0 && (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">შედეგი ვერ მოიძებნა</p>
                  <p className="text-xs text-muted-foreground">სცადეთ სხვა საძიებო სიტყვა</p>
                </div>
              )}

              {/* Results */}
              {!loading && inputValue && results.length > 0 && (
                <div className="space-y-4">
                  {Object.entries(groupedResults).map(([category, items]) => {
                    if (items.length === 0) return null;
                    const config = categoryConfig[category as SearchCategory];
                    const Icon = config.icon;

                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${config.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">{config.label}</span>
                          <Badge variant="outline" className="text-[10px] ml-auto">
                            {items.length}
                          </Badge>
                        </div>
                        <div className="space-y-0.5">
                          {items.slice(0, 4).map(renderResultItem)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* View All Footer */}
          {inputValue && results.length > 0 && (
            <div className="p-3 border-t border-border/50 bg-secondary/30">
              <button
                onClick={handleViewAll}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors"
              >
                <span>ყველა შედეგის ნახვა ({results.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AISearchDropdown.displayName = 'AISearchDropdown';

export default AISearchDropdown;
