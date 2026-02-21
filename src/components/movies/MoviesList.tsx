import { memo, useState } from 'react';
import { Film, Loader2 } from 'lucide-react';
import { useMovies } from '@/hooks/useMovies';
import { MovieFilters as MovieFiltersType, DEFAULT_FILTERS } from './types';
import MovieCard from './MovieCard';
import MovieFilters from './MovieFilters';
import { useMoviesPresence } from '@/hooks/useFeaturePresence';

const MoviesList = memo(() => {
  const [filters, setFilters] = useState<MovieFiltersType>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const { data: movies = [], isLoading, error } = useMovies(filters);
  
  // Track user presence in movies section (5-minute window)
  useMoviesPresence(true);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-3 flex items-center gap-3">
          <Film className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">ფილმები</h1>
        </div>
      </div>

      {/* Filters */}
      <MovieFilters
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalResults={movies.length}
      />

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive">შეცდომა ჩატვირთვისას</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">ფილმები არ მოიძებნა</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} viewMode="grid" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} viewMode="list" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

MoviesList.displayName = 'MoviesList';

export default MoviesList;
