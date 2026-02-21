import { memo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, Globe, Eye, Play, 
  Film, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMovie, useIncrementMovieViews } from '@/hooks/useMovies';
import MoviePlayer from './MoviePlayer';
import FacebookFeedActions from '@/components/feed/FacebookFeedActions';
import FacebookReactionsBar from '@/components/feed/FacebookReactionsBar';
import ShareModal from '@/components/feed/ShareModal';
// VideoCommentsModal removed
import { GenderAvatar } from '@/components/shared/GenderAvatar';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const MovieDetail = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: movie, isLoading, error } = useMovie(id);
  const incrementViews = useIncrementMovieViews();
  const [hasIncrementedView, setHasIncrementedView] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  // Increment view count once
  useEffect(() => {
    if (movie && !hasIncrementedView) {
      incrementViews.mutate(movie.id);
      setHasIncrementedView(true);
    }
  }, [movie, hasIncrementedView, incrementViews]);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} საათი ${mins} წუთი` : `${mins} წუთი`;
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleCommentClick = () => {
    setShowCommentsModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <Skeleton className="h-10 w-24 mb-4" />
          <div className="flex flex-col lg:flex-row gap-6">
            <Skeleton className="w-full lg:w-72 aspect-[2/3] rounded-lg" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">ფილმი ვერ მოიძებნა</h2>
          <p className="text-muted-foreground mb-4">
            ეს ფილმი წაშლილია ან არ არსებობს
          </p>
          <Button onClick={() => navigate('/movies')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            უკან დაბრუნება
          </Button>
        </div>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(movie.created_at), {
    addSuffix: true,
    locale: ka,
  });

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Fixed Header */}
      <div className="flex-none z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/movies')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg truncate flex-1">{movie.title_ka}</h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 max-w-6xl mx-auto">
          {/* Publisher Info */}
          {movie.profiles && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-card rounded-lg border border-border">
              <GenderAvatar 
                src={movie.profiles.avatar_url}
                username={movie.profiles.username}
                gender={movie.profiles.gender}
                className="w-10 h-10"
              />
              <div>
                <p className="font-medium">{movie.profiles.username}</p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
            </div>
          )}

          {/* Movie Info Section */}
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            {/* Poster */}
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              <div className="relative w-48 sm:w-56 lg:w-72 aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-lg">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title_ka}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Film className="w-16 h-16 text-primary/50" />
                  </div>
                )}
                {movie.age_rating !== '0+' && (
                  <Badge 
                    variant="destructive" 
                    className="absolute top-3 left-3"
                  >
                    {movie.age_rating}
                  </Badge>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{movie.title_ka}</h1>
                {movie.title_en && (
                  <p className="text-lg text-muted-foreground">{movie.title_en}</p>
                )}
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {movie.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {movie.year}
                  </span>
                )}
                {movie.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(movie.duration_minutes)}
                  </span>
                )}
                {movie.country && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {movie.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {movie.views_count} ნახვა
                </span>
              </div>

              {/* Genres */}
              {movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Tags */}
              {movie.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {movie.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Description */}
              {movie.description_ka && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {movie.description_ka}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reactions Bar */}
          <div className="bg-card rounded-lg border border-border mb-4">
            <FacebookReactionsBar
              itemId={movie.id}
              itemType="video"
              commentsCount={0}
              onCommentsClick={handleCommentClick}
            />
            <FacebookFeedActions
              itemId={movie.id}
              itemType="video"
              ownerId={movie.created_by || ''}
              onCommentClick={handleCommentClick}
              onShareClick={handleShareClick}
            />
          </div>

          {/* Player Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Play className="w-5 h-5" />
              უყურე
            </h2>
            <MoviePlayer sources={movie.sources || []} movieTitle={movie.title_ka} />
          </div>

          {/* Trailer */}
          {movie.trailer_url && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold">ტრეილერი</h2>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={movie.trailer_url}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments removed — video_comments table no longer exists */}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          postId={movie.id}
          postUrl={`${window.location.origin}/movies/${movie.id}`}
          postTitle={movie.title_ka}
          onClose={() => setShowShareModal(false)}
          onShareComplete={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
});

MovieDetail.displayName = 'MovieDetail';

export default MovieDetail;
