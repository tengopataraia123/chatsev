import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Plus, Music, Search, Heart, MoreHorizontal, Clock, TrendingUp, ListMusic, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMusicPlayerContext, type MusicTrack } from '@/contexts/MusicPlayerContext';
import ModernMusicPlayer from '@/components/music/ModernMusicPlayer';
import MusicQueue from '@/components/music/MusicQueue';
import MusicUploadModal from '@/components/music/MusicUploadModal';
import PlaylistModal from '@/components/music/PlaylistModal';

interface MusicViewProps {
  onBack: () => void;
}

const MusicView = ({ onBack }: MusicViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('newest');
  const [showUpload, setShowUpload] = useState(false);
  const [playlistModal, setPlaylistModal] = useState<{ open: boolean; trackId?: string }>({ open: false });

  const player = useMusicPlayerContext();

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('music')
        .select('*')
        .eq('status', 'approved');

      if (sortBy === 'popular') {
        query = query.order('plays', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, searchQuery]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handlePlayTrack = (track: MusicTrack) => {
    if (player.currentTrack?.id === track.id) {
      player.togglePlayPause();
    } else {
      player.playTrack(track, tracks);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col bg-background pb-32" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex-none z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">მუსიკა</h1>
          </div>
          {user && (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-1" />
              ატვირთვა
            </Button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'popular' | 'newest')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="newest" className="gap-2">
                <Clock className="w-4 h-4" />
                ახალი
              </TabsTrigger>
              <TabsTrigger value="popular" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                პოპულარული
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">მუსიკა არ მოიძებნა</p>
          </div>
        ) : (
          tracks.map((track, index) => (
            <div
              key={track.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                player.currentTrack?.id === track.id ? 'bg-primary/10' : 'hover:bg-muted/50'
              }`}
              onClick={() => handlePlayTrack(track)}
            >
              <div className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex-shrink-0 overflow-hidden">
                {track.cover_url ? (
                  <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                )}
                {player.currentTrack?.id === track.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    {player.isPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{track.title}</p>
                <p className="text-sm text-muted-foreground truncate">{track.artist || 'უცნობი'}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDuration(track.duration)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${player.isLiked(track.id) ? 'text-red-500' : ''}`}
                  onClick={(e) => { e.stopPropagation(); player.toggleLike(track.id); }}
                >
                  <Heart className="w-4 h-4" fill={player.isLiked(track.id) ? 'currentColor' : 'none'} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => player.addToQueue(track)}>
                      <ListMusic className="w-4 h-4 mr-2" />
                      რიგში დამატება
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPlaylistModal({ open: true, trackId: track.id })}>
                      <Plus className="w-4 h-4 mr-2" />
                      პლეილისტში
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Player */}
      {player.currentTrack && !player.showQueue && (
        <ModernMusicPlayer
          track={player.currentTrack}
          queue={player.queue}
          isPlaying={player.isPlaying}
          onPlayPause={player.togglePlayPause}
          onNext={player.handleNext}
          onPrevious={player.handlePrevious}
          onSeek={player.seek}
          onQueueClick={player.toggleQueue}
          onLike={player.toggleLike}
          onAddToPlaylist={(id) => setPlaylistModal({ open: true, trackId: id })}
          isLiked={player.isLiked(player.currentTrack.id)}
          repeatMode={player.repeatMode}
          shuffleOn={player.shuffleOn}
          onRepeatToggle={player.toggleRepeat}
          onShuffleToggle={player.toggleShuffle}
          currentTime={player.currentTime}
          duration={player.duration}
          isExpanded={player.isExpanded}
          onToggleExpand={player.toggleExpand}
        />
      )}

      {/* Queue */}
      {player.showQueue && (
        <MusicQueue
          queue={player.queue}
          currentTrack={player.currentTrack}
          currentIndex={player.currentIndex}
          onTrackSelect={player.selectTrackFromQueue}
          onRemoveFromQueue={player.removeFromQueue}
          onClearQueue={player.clearQueue}
          onClose={player.toggleQueue}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <MusicUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={fetchTracks}
        />
      )}

      {/* Playlist Modal */}
      {playlistModal.open && (
        <PlaylistModal
          trackIdToAdd={playlistModal.trackId}
          onClose={() => setPlaylistModal({ open: false })}
          mode="add-to"
        />
      )}
    </div>
  );
};

export default MusicView;