import { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { 
  Play, Calendar, Clock, Eye, Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import ShareModal from './ShareModal';
import FullscreenMoviePlayer from '@/components/movies/FullscreenMoviePlayer';
import FacebookFeedActions from './FacebookFeedActions';
import FacebookReactionsBar from './FacebookReactionsBar';
// VideoCommentsModal removed - using inline comments
import { GenderAvatar } from '@/components/shared/GenderAvatar';
import { MovieSource } from '@/components/movies/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MovieFeedData {
  id: string;
  title_ka: string;
  title_en: string | null;
  year: number | null;
  genres: string[] | null;
  country: string | null;
  duration_minutes: number | null;
  description_ka: string | null;
  poster_url: string | null;
  age_rating: string | null;
  views_count: number;
  created_at: string;
  created_by: string | null;
  sources?: MovieSource[];
  profiles?: {
    username: string;
    avatar_url: string | null;
    gender: string | null;
  };
}

interface MovieFeedCardProps {
  movie: MovieFeedData;
  onUserClick?: (userId: string) => void;
}

const MovieFeedCard = memo(({ movie, onUserClick }: MovieFeedCardProps) => {
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sources, setSources] = useState<MovieSource[]>(movie.sources || []);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loadingSources, setLoadingSources] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(movie.created_at), {
    addSuffix: true,
    locale: ka,
  });

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}სთ ${mins}წთ` : `${mins}წთ`;
  };

  // Load sources when opening player
  const handlePlayClick = useCallback(async () => {
    if (sources.length === 0 && !movie.sources?.length) {
      setLoadingSources(true);
      try {
        const { data } = await supabase
          .from('movie_sources')
          .select('*')
          .eq('movie_id', movie.id)
          .eq('is_active', true)
          .order('priority', { ascending: true });
        
        setSources((data as MovieSource[]) || []);
      } catch (error) {
        console.error('Failed to load movie sources:', error);
      } finally {
        setLoadingSources(false);
      }
    }
    setShowPlayer(true);
  }, [movie.id, sources.length, movie.sources]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleCommentClick = useCallback(() => {
    setShowCommentsModal(true);
  }, []);

  const handleSourceChange = useCallback((sourceId: string) => {
    const index = sources.findIndex(s => s.id === sourceId);
    if (index >= 0) setActiveSourceIndex(index);
  }, [sources]);

  return (
    <>
      <Card className="overflow-hidden bg-card border border-border">
        {/* Header - Publisher Info */}
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            {movie.profiles?.username ? (
              <>
                <div 
                  className="cursor-pointer"
                  onClick={() => movie.created_by && onUserClick?.(movie.created_by)}
                >
                  <GenderAvatar 
                    userId={movie.created_by}
                    src={movie.profiles?.avatar_url}
                    username={movie.profiles?.username}
                    gender={movie.profiles?.gender}
                    className="w-10 h-10"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    {movie.profiles.username}
                    <Badge variant="secondary" className="text-xs">ფილმები</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Film className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    ახალი ფილმი
                    <Badge variant="secondary" className="text-xs">ფილმები</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Movie Content */}
        <div className="flex flex-col sm:flex-row">
          {/* Poster - Clickable to play */}
          <div 
            className="relative flex-shrink-0 cursor-pointer group"
            onClick={handlePlayClick}
          >
            <div className="w-full sm:w-40 md:w-48 aspect-[2/3] bg-muted">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title_ka}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Film className="w-12 h-12 text-primary/50" />
                </div>
              )}
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="w-8 h-8 text-foreground ml-1" fill="currentColor" />
                </div>
              </div>

              {/* Age rating badge */}
              {movie.age_rating && movie.age_rating !== '0+' && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-2 left-2 text-xs"
                >
                  {movie.age_rating}
                </Badge>
              )}

              {/* Views badge */}
              <div className="absolute bottom-2 right-2">
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-black/70 text-white text-xs">
                  <Eye className="w-3 h-3" />
                  {movie.views_count}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
            <div>
              <Link to={`/movies/${movie.id}`}>
                <h3 className="font-bold text-lg line-clamp-2 hover:text-primary transition-colors">
                  {movie.title_ka}
                </h3>
              </Link>
              
              {movie.title_en && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {movie.title_en}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
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
              </div>

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
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

              {/* Description */}
              {movie.description_ka && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {movie.description_ka}
                </p>
              )}
            </div>

            {/* Action button */}
            <div className="mt-3">
              <Button 
                onClick={handlePlayClick}
                disabled={loadingSources}
                className="w-full sm:w-auto"
              >
                <Play className="w-4 h-4 mr-2" fill="currentColor" />
                უყურე ახლავე
              </Button>
            </div>
          </div>
        </div>

        {/* Facebook Reactions Bar */}
        <FacebookReactionsBar
          itemId={movie.id}
          itemType="video"
          commentsCount={0}
          onCommentsClick={handleCommentClick}
          onUserClick={onUserClick}
        />

        {/* Facebook-style Action buttons */}
        <FacebookFeedActions
          itemId={movie.id}
          itemType="video"
          ownerId={movie.created_by || ''}
          onCommentClick={handleCommentClick}
          onShareClick={handleShare}
        />
      </Card>

      {/* Fullscreen Player */}
      {showPlayer && sources.length > 0 && (
        <FullscreenMoviePlayer
          source={sources[activeSourceIndex]}
          movieTitle={movie.title_ka}
          allSources={sources}
          onClose={() => setShowPlayer(false)}
          onSourceChange={handleSourceChange}
        />
      )}

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
    </>
  );
});

MovieFeedCard.displayName = 'MovieFeedCard';

export default MovieFeedCard;
