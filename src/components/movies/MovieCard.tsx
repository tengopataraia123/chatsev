import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Calendar, Clock, Eye } from 'lucide-react';
import { Movie } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MovieCardProps {
  movie: Movie;
  viewMode?: 'grid' | 'list';
}

const MovieCard = memo(({ movie, viewMode = 'grid' }: MovieCardProps) => {
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}ს ${mins}წ` : `${mins}წ`;
  };

  if (viewMode === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex flex-col sm:flex-row">
          {/* Poster */}
          <Link to={`/movies/${movie.id}`} className="flex-shrink-0">
            <div className="relative w-full sm:w-32 md:w-40 aspect-[2/3] sm:aspect-[2/3] bg-muted">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title_ka}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Play className="w-10 h-10 text-primary/50" />
                </div>
              )}
              {movie.age_rating !== '0+' && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-2 left-2 text-xs"
                >
                  {movie.age_rating}
                </Badge>
              )}
            </div>
          </Link>

          {/* Content */}
          <CardContent className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
            <div>
              <Link to={`/movies/${movie.id}`}>
                <h3 className="font-semibold text-base sm:text-lg line-clamp-2 hover:text-primary transition-colors">
                  {movie.title_ka}
                </h3>
              </Link>
              
              {movie.title_en && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {movie.title_en}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                {movie.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {movie.year}
                  </span>
                )}
                {movie.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(movie.duration_minutes)}
                  </span>
                )}
                {movie.views_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {movie.views_count}
                  </span>
                )}
              </div>

              {movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {movie.genres.slice(0, 3).map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                  {movie.genres.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{movie.genres.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {movie.description_ka && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2 hidden sm:block">
                  {movie.description_ka}
                </p>
              )}
            </div>

            <Link to={`/movies/${movie.id}`} className="mt-3">
              <Button size="sm" className="w-full sm:w-auto">
                <Play className="w-4 h-4 mr-1" />
                ნახვა
              </Button>
            </Link>
          </CardContent>
        </div>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <Link to={`/movies/${movie.id}`}>
        <div className="relative aspect-[2/3] bg-muted overflow-hidden">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title_ka}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Play className="w-12 h-12 text-primary/50" />
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" variant="secondary">
              <Play className="w-4 h-4 mr-1" />
              ნახვა
            </Button>
          </div>

          {/* Age rating badge */}
          {movie.age_rating !== '0+' && (
            <Badge 
              variant="destructive" 
              className="absolute top-2 left-2 text-xs"
            >
              {movie.age_rating}
            </Badge>
          )}

          {/* Year badge */}
          {movie.year && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 text-xs bg-black/70 text-white border-0"
            >
              {movie.year}
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-3">
        <Link to={`/movies/${movie.id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors min-h-[2.5rem]">
            {movie.title_ka}
          </h3>
        </Link>

        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {movie.genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="outline" className="text-[10px] px-1.5 py-0">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          {movie.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(movie.duration_minutes)}
            </span>
          )}
          {movie.views_count > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {movie.views_count}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;
