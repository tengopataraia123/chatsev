import { memo, useState } from 'react';
import { Play, Film, Loader2, Monitor, Maximize2 } from 'lucide-react';
import { MovieSource, MovieSourceType } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FullscreenMoviePlayer from './FullscreenMoviePlayer';

interface MoviePlayerProps {
  sources: MovieSource[];
  movieTitle: string;
}

const MoviePlayer = memo(({ sources, movieTitle }: MoviePlayerProps) => {
  const [activeSourceId, setActiveSourceId] = useState<string>(sources[0]?.id || '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeSource = sources.find((s) => s.id === activeSourceId) || sources[0];

  if (sources.length === 0) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center rounded-lg">
        <div className="text-center p-4">
          <Film className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">წყარო არ არის ხელმისაწვდომი</p>
        </div>
      </div>
    );
  }

  const getSourceTypeLabel = (type: MovieSourceType): string => {
    const labels: Record<MovieSourceType, string> = {
      mp4: 'MP4',
      hls_m3u8: 'HLS',
      iframe: 'Player',
      youtube: 'YouTube',
      vimeo: 'Vimeo',
      external: 'წყარო',
    };
    return labels[type] || 'წყარო';
  };

  const getSourceIcon = (type: MovieSourceType) => {
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      {/* Player Preview Card */}
      <div 
        className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-xl overflow-hidden cursor-pointer group shadow-lg"
        onClick={() => setIsFullscreen(true)}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-primary/20 to-transparent" />
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-transform group-hover:scale-105">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl group-hover:bg-primary transition-colors">
            <Play className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground ml-1" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold text-lg">ფილმის ყურება</p>
            <p className="text-muted-foreground text-sm">დააჭირე სრულეკრანიანი რეჟიმისთვის</p>
          </div>
        </div>

        {/* Active Source Badge */}
        {activeSource && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge variant="secondary" className="bg-black/60 text-white border-0">
              {getSourceTypeLabel(activeSource.source_type)}
            </Badge>
            {activeSource.quality && (
              <Badge variant="outline" className="bg-black/60 text-white border-white/30">
                {activeSource.quality}
              </Badge>
            )}
          </div>
        )}

        {/* Fullscreen Hint */}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/60 text-white text-xs">
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">სრული ეკრანი</span>
          </div>
        </div>
      </div>

      {/* Source Selector */}
      {sources.length > 1 && (
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground mb-2 px-1">აირჩიე წყარო:</p>
          <Tabs value={activeSourceId} onValueChange={setActiveSourceId}>
            <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent">
              {sources.map((source, index) => (
                <TabsTrigger
                  key={source.id}
                  value={source.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5 text-sm"
                >
                  <span className="mr-1">{source.label || `წყარო ${index + 1}`}</span>
                  {source.quality && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                      {source.quality}
                    </Badge>
                  )}
                  {source.language && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                      {source.language}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Single Source Button (if only one) */}
      {sources.length === 1 && activeSource && (
        <Button 
          className="w-full" 
          size="lg"
          onClick={() => setIsFullscreen(true)}
        >
          <Play className="w-5 h-5 mr-2" />
          უყურე - {activeSource.label || getSourceTypeLabel(activeSource.source_type)}
          {activeSource.quality && ` (${activeSource.quality})`}
        </Button>
      )}

      {/* Fullscreen Player Modal */}
      {isFullscreen && activeSource && (
        <FullscreenMoviePlayer
          source={activeSource}
          movieTitle={movieTitle}
          allSources={sources}
          onClose={() => setIsFullscreen(false)}
          onSourceChange={setActiveSourceId}
        />
      )}
    </div>
  );
});

MoviePlayer.displayName = 'MoviePlayer';

export default MoviePlayer;
