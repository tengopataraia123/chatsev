import { useState, useMemo, useCallback, forwardRef, memo, useEffect } from 'react';
import { X, Search, Loader2, ArrowUpDown, SortAsc, SortDesc, Calendar, Clock, TrendingUp, ChevronLeft, FolderOpen, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGifCache } from './useGifCache';

interface Gif {
  id: string;
  title: string;
  file_original: string;
  file_preview: string | null;
  category_id: string | null;
  usage_count?: number;
  created_at?: string;
  shortcode?: string | null;
}

interface CategoryWithCount {
  id: string;
  name: string;
  gif_count: number;
}

type SortBy = 'popularity' | 'newest' | 'oldest' | 'alphabetical' | 'alphabetical_desc';

interface GifPickerProps {
  onSelect: (gif: Gif) => void;
  onClose: () => void;
  insertShortcodeMode?: boolean;
  onInsertShortcode?: (shortcode: string) => void;
}

// Optimized GIF item with loading state
const GifItem = memo(({ gif, onClick }: { gif: Gif; onClick: () => void }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // Use preview image for thumbnails (smaller, faster)
  const thumbnailSrc = gif.file_preview || gif.file_original;
  
  return (
    <button
      onClick={onClick}
      className="relative w-[55px] h-[55px] rounded-md overflow-hidden bg-secondary group flex-shrink-0"
    >
      {/* Skeleton placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted animate-pulse" />
      )}
      
      <img
        src={thumbnailSrc}
        alt={gif.title}
        className={`w-full h-full object-cover transition-opacity duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <Image className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
    </button>
  );
});
GifItem.displayName = 'GifItem';

// Memoized category item with hover preload
const CategoryItem = memo(({ 
  category, 
  onClick, 
  onHover 
}: { 
  category: CategoryWithCount; 
  onClick: () => void;
  onHover: () => void;
}) => (
  <button
    onClick={onClick}
    onMouseEnter={onHover}
    onTouchStart={onHover}
    className="p-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors text-center"
  >
    <span className="text-sm font-medium line-clamp-2">{category.name}</span>
  </button>
));
CategoryItem.displayName = 'CategoryItem';

const GifPicker = forwardRef<HTMLDivElement, GifPickerProps>(({ 
  onSelect, 
  onClose, 
  insertShortcodeMode, 
  onInsertShortcode 
}, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithCount | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('popularity');
  const { user } = useAuth();
  
  // Use cached data
  const { categories, loading, getGifsForCategory, preloadCategory } = useGifCache();

  // Get GIFs from cache - instant!
  const gifs = useMemo(() => {
    if (!selectedCategory) return [];
    return getGifsForCategory(selectedCategory.id, sortBy, searchQuery);
  }, [selectedCategory, sortBy, searchQuery, getGifsForCategory]);

  // Preload all category images when picker opens
  useEffect(() => {
    if (categories.length > 0) {
      // Preload first 3 categories aggressively
      categories.slice(0, 3).forEach(cat => {
        preloadCategory(cat.id);
      });
    }
  }, [categories, preloadCategory]);

  const getSortLabel = useCallback((sort: SortBy) => {
    switch (sort) {
      case 'popularity': return 'პოპულარობით';
      case 'newest': return 'უახლესი';
      case 'oldest': return 'უძველესი';
      case 'alphabetical': return 'ა-ჰ';
      case 'alphabetical_desc': return 'ჰ-ა';
      default: return 'პოპულარობით';
    }
  }, []);

  const handleCategoryHover = useCallback((categoryId: string) => {
    preloadCategory(categoryId);
  }, [preloadCategory]);

  const handleSelectCategory = useCallback((category: CategoryWithCount) => {
    preloadCategory(category.id);
    setSelectedCategory(category);
    setSearchQuery('');
  }, [preloadCategory]);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
    setSearchQuery('');
  }, []);

  const handleSelectGif = useCallback(async (gif: Gif) => {
    if (insertShortcodeMode && onInsertShortcode && gif.shortcode) {
      onInsertShortcode(gif.shortcode);
      onClose();
      return;
    }
    
    // Record usage in background
    if (user) {
      supabase.from('gif_recent').insert({
        user_id: user.id,
        gif_id: gif.id
      }).then(() => {});

      supabase
        .from('gifs')
        .update({ usage_count: (gif.usage_count || 0) + 1 })
        .eq('id', gif.id)
        .then(() => {});
    }
    
    onSelect(gif);
  }, [user, insertShortcodeMode, onInsertShortcode, onClose, onSelect]);

  const showGifs = selectedCategory !== null;

  return (
    <div ref={ref} className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[10vh] sm:items-center sm:pt-0">
      <div className="bg-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {showGifs && (
              <button 
                onClick={handleBackToCategories} 
                className="p-1 hover:bg-secondary rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="font-semibold text-lg">
              {showGifs ? selectedCategory?.name : 'კატეგორიები'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Sort - only in GIFs view */}
        {showGifs && (
          <div className="p-3 border-b border-border shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="მოძებნე GIF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-10">
                    <ArrowUpDown className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">{getSortLabel(sortBy)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>დახარისხება</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortBy('popularity')} className={sortBy === 'popularity' ? 'bg-primary/10' : ''}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    პოპულარობით
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('newest')} className={sortBy === 'newest' ? 'bg-primary/10' : ''}>
                    <Calendar className="w-4 h-4 mr-2" />
                    უახლესი
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('oldest')} className={sortBy === 'oldest' ? 'bg-primary/10' : ''}>
                    <Clock className="w-4 h-4 mr-2" />
                    უძველესი
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortBy('alphabetical')} className={sortBy === 'alphabetical' ? 'bg-primary/10' : ''}>
                    <SortAsc className="w-4 h-4 mr-2" />
                    ანბანით (ა-ჰ)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('alphabetical_desc')} className={sortBy === 'alphabetical_desc' ? 'bg-primary/10' : ''}>
                    <SortDesc className="w-4 h-4 mr-2" />
                    ანბანით (ჰ-ა)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Content - scrollable area */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
          {loading && categories.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : showGifs ? (
            gifs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                GIF-ები არ მოიძებნა
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 pb-4">
                {gifs.map((gif) => (
                  <GifItem 
                    key={gif.id} 
                    gif={gif} 
                    onClick={() => handleSelectGif(gif)} 
                  />
                ))}
              </div>
            )
          ) : (
            categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                კატეგორიები არ არის
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {categories.map((category) => (
                  <CategoryItem 
                    key={category.id} 
                    category={category} 
                    onClick={() => handleSelectCategory(category)}
                    onHover={() => handleCategoryHover(category.id)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
});

GifPicker.displayName = 'GifPicker';

export default GifPicker;
