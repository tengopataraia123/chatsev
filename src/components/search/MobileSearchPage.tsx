import { useState, useCallback, memo, useEffect } from 'react';
import { ArrowLeft, Search, X, TrendingUp, Clock, User, FileText, Hash, Image, MessageSquare, Users, Loader2 } from 'lucide-react';
import { useAISmartSearch, SearchResult, getRecentSearches, saveRecentSearch, clearRecentSearch, clearAllRecentSearches } from '@/hooks/useAISmartSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import StyledUsername from '@/components/username/StyledUsername';

interface MobileSearchPageProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
  onPostClick?: (postId: string) => void;
  onPollClick?: (pollId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
}

const MobileSearchPage = memo(({
  onBack,
  onUserClick,
  onPostClick,
  onPollClick,
  onGroupClick,
  onHashtagClick
}: MobileSearchPageProps) => {
  const [inputValue, setInputValue] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { results, loading, performSearch, trendingHashtags, fetchTrendingHashtags, clearSearch } = useAISmartSearch();

  // Load recent searches and trending
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    fetchTrendingHashtags();
  }, [fetchTrendingHashtags]);

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setInputValue(searchTerm);
    if (searchTerm.trim().length >= 2) {
      performSearch(searchTerm, 'all', 'relevance', 0);
    } else {
      clearSearch();
    }
  }, [performSearch, clearSearch]);

  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    saveRecentSearch(inputValue);
    setRecentSearches(getRecentSearches());
    
    switch (result.type) {
      case 'users':
        onUserClick?.(result.id);
        onBack();
        break;
      case 'posts':
        onPostClick?.(result.id);
        onBack();
        break;
      case 'polls':
        onPollClick?.(result.id);
        onBack();
        break;
      case 'groups':
        onGroupClick?.(result.id);
        onBack();
        break;
      case 'hashtags':
        onHashtagClick?.(result.title);
        onBack();
        break;
      default:
        break;
    }
  }, [inputValue, onUserClick, onPostClick, onPollClick, onGroupClick, onHashtagClick, onBack]);

  // Clear all recent searches
  const handleClearRecentSearches = useCallback(() => {
    clearAllRecentSearches();
    setRecentSearches([]);
  }, []);

  // Remove single recent search
  const handleRemoveRecentSearch = useCallback((searchTerm: string) => {
    clearRecentSearch(searchTerm);
    setRecentSearches(getRecentSearches());
  }, []);

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'users': return User;
      case 'posts': return FileText;
      case 'hashtags': return Hash;
      case 'media': return Image;
      case 'comments': return MessageSquare;
      case 'groups': return Users;
      default: return FileText;
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const hasResults = results.length > 0;
  const showEmptyState = inputValue.length >= 2 && !loading && !hasResults;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div 
        className="bg-card border-b border-border shrink-0"
      >
        <div className="flex items-center gap-3 px-3 h-[56px]">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="მოძებნე მომხმარებლები, პოსტები..."
              value={inputValue}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              className={cn(
                "w-full pl-10 pr-10 py-2.5 rounded-xl",
                "bg-secondary/50 border border-border/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                "placeholder:text-muted-foreground/60 text-sm"
              )}
            />
            {inputValue && (
              <button
                onClick={() => { setInputValue(''); clearSearch(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">შედეგები ვერ მოიძებნა</p>
              <p className="text-sm text-muted-foreground/70 mt-1">სცადეთ სხვა საძიებო სიტყვა</p>
            </div>
          )}

          {/* Search Results */}
          {!loading && hasResults && (
            <div className="space-y-6">
              {/* Users */}
              {groupedResults['users']?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    მომხმარებლები
                  </h3>
                  <div className="space-y-2">
                    {groupedResults['users'].slice(0, 5).map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={result.imageUrl || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {result.title[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">
                            <StyledUsername userId={result.id} username={result.title} />
                          </div>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{result.subtitle}</p>
                          )}
                        </div>
                        {result.isVerified && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {groupedResults['posts']?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    პოსტები
                  </h3>
                  <div className="space-y-2">
                    {groupedResults['posts'].slice(0, 5).map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground mt-1">{result.subtitle}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups */}
              {groupedResults['groups']?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    ჯგუფები
                  </h3>
                  <div className="space-y-2">
                    {groupedResults['groups'].slice(0, 5).map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent/30 flex items-center justify-center">
                          <Users className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {groupedResults['hashtags']?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    ჰეშთეგები
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {groupedResults['hashtags'].slice(0, 10).map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                      >
                        #{result.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Results */}
              {Object.entries(groupedResults)
                .filter(([type]) => !['users', 'posts', 'groups', 'hashtags'].includes(type))
                .map(([type, items]) => (
                  <div key={type}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2 capitalize">
                      {(() => { const Icon = getResultIcon(type); return <Icon className="w-4 h-4" />; })()}
                      {type === 'blogs' ? 'ბლოგები' : 
                       type === 'videos' ? 'ვიდეოები' : 
                       type === 'music' ? 'მუსიკა' : 
                       type === 'polls' ? 'გამოკითხვები' :
                       type === 'events' ? 'ივენთები' : 
                       type === 'comments' ? 'კომენტარები' : type}
                    </h3>
                    <div className="space-y-2">
                      {items.slice(0, 3).map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                        >
                          {result.imageUrl ? (
                            <img src={result.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                              {(() => { const Icon = getResultIcon(type); return <Icon className="w-5 h-5 text-muted-foreground" />; })()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{result.title}</p>
                            {result.subtitle && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{result.subtitle}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Initial State - Trending & Recent */}
          {!loading && !hasResults && inputValue.length < 2 && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      ბოლო ძიებები
                    </h3>
                    <button
                      onClick={handleClearRecentSearches}
                      className="text-xs text-primary hover:underline"
                    >
                      გასუფთავება
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <button
                          onClick={() => handleSearch(term)}
                          className="flex-1 text-left text-sm"
                        >
                          {term}
                        </button>
                        <button
                          onClick={() => handleRemoveRecentSearch(term)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded-full transition-all"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Hashtags */}
              {trendingHashtags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    ტრენდული ჰეშთეგები
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.slice(0, 15).map((tag) => (
                      <button
                        key={tag.tag}
                        onClick={() => {
                          onHashtagClick?.(tag.tag);
                          onBack();
                        }}
                        className="px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                      >
                        #{tag.tag}
                        <span className="ml-1 text-xs opacity-70">({tag.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Suggestions */}
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">ჩაწერეთ მინიმუმ 2 სიმბოლო ძიებისთვის</p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

MobileSearchPage.displayName = 'MobileSearchPage';

export default MobileSearchPage;
