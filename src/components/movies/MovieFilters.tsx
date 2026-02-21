import { memo, useState } from 'react';
import { Search, Filter, X, Grid3X3, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MovieFilters as MovieFiltersType, DEFAULT_FILTERS, AgeRating } from './types';
import { useMovieGenres } from '@/hooks/useMovies';

interface MovieFiltersProps {
  filters: MovieFiltersType;
  onFiltersChange: (filters: MovieFiltersType) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalResults?: number;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'უახლესი' },
  { value: 'oldest', label: 'ძველი' },
  { value: 'year_desc', label: 'წელი (კლებადი)' },
  { value: 'year_asc', label: 'წელი (ზრდადი)' },
  { value: 'title_asc', label: 'სათაური (A-Z)' },
  { value: 'title_desc', label: 'სათაური (Z-A)' },
  { value: 'views', label: 'პოპულარული' },
];

const AGE_RATINGS: AgeRating[] = ['0+', '6+', '12+', '16+', '18+'];

const MovieFiltersComponent = memo(({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  totalResults,
}: MovieFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const { data: genres = [] } = useMovieGenres();

  const updateFilter = <K extends keyof MovieFiltersType>(key: K, value: MovieFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleGenre = (genreName: string) => {
    const newGenres = filters.genres.includes(genreName)
      ? filters.genres.filter((g) => g !== genreName)
      : [...filters.genres, genreName];
    updateFilter('genres', newGenres);
  };

  const clearFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.genres.length > 0 ||
    filters.yearFrom !== null ||
    filters.yearTo !== null ||
    filters.country !== '' ||
    filters.ageRating !== '';

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10">
      {/* Search and View Toggle Row */}
      <div className="p-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ძებნა..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1 relative">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">ფილტრები</span>
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        <div className="hidden sm:flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 rounded-r-none"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 rounded-l-none"
            onClick={() => onViewModeChange('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expandable Filters */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="border-t border-border">
          <div className="p-3 space-y-4">
            {/* Genres - Collapsible Dropdown */}
            <Collapsible open={isGenreOpen} onOpenChange={setIsGenreOpen}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ჟანრი</label>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-9 font-normal"
                  >
                    <span className="text-muted-foreground">
                      {filters.genres.length > 0 ? (
                        <span className="flex items-center gap-2">
                          <span>არჩეულია</span>
                          <Badge variant="secondary" className="text-xs">
                            {filters.genres.length}
                          </Badge>
                        </span>
                      ) : (
                        'აირჩიეთ ჟანრი'
                      )}
                    </span>
                    {isGenreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-2">
                <div className="border border-border rounded-lg overflow-hidden">
                  <ScrollArea className="h-40">
                    <div className="p-2 space-y-1">
                      {[...genres]
                        .sort((a, b) => a.name_ka.localeCompare(b.name_ka, 'ka'))
                        .map((genre) => (
                          <div
                            key={genre.id}
                            className={`px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                              filters.genres.includes(genre.name_ka)
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => toggleGenre(genre.name_ka)}
                          >
                            {genre.name_ka}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Year Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">წელი (დან)</label>
              <Select
                  value={filters.yearFrom?.toString() || 'all'}
                  onValueChange={(v) => updateFilter('yearFrom', v === 'all' ? null : parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="აირჩიეთ" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">ყველა</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">წელი (მდე)</label>
              <Select
                  value={filters.yearTo?.toString() || 'all'}
                  onValueChange={(v) => updateFilter('yearTo', v === 'all' ? null : parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="აირჩიეთ" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">ყველა</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Country and Age Rating */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">ქვეყანა</label>
                <Input
                  placeholder="მაგ: საქართველო"
                  value={filters.country}
                  onChange={(e) => updateFilter('country', e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">ასაკი</label>
              <Select
                  value={filters.ageRating || 'all'}
                  onValueChange={(v) => updateFilter('ageRating', v === 'all' ? '' : v as AgeRating)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="ყველა" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ყველა</SelectItem>
                    {AGE_RATINGS.map((rating) => (
                      <SelectItem key={rating} value={rating}>
                        {rating}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">სორტირება</label>
              <Select
                value={filters.sortBy}
                onValueChange={(v) => updateFilter('sortBy', v as MovieFiltersType['sortBy'])}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                ფილტრების გასუფთავება
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results count */}
      {totalResults !== undefined && (
        <div className="px-3 pb-2 text-sm text-muted-foreground">
          ნაპოვნია: {totalResults} ფილმი
        </div>
      )}
    </div>
  );
});

MovieFiltersComponent.displayName = 'MovieFilters';

export default MovieFiltersComponent;
