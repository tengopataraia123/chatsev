import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Music, Search, X, Play, Pause, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectedMusic {
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string;
  startTime: number;
  deezerId?: string;
}

interface StoryMusicPickerProps {
  selectedMusic: SelectedMusic | null;
  onSelect: (music: SelectedMusic | null) => void;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  preview_url: string;
  artwork_url: string;
  duration: number;
  provider?: string;
  youtube_id?: string;
  youtube_thumbnail?: string;
}

const StoryMusicPicker = memo(function StoryMusicPicker({ selectedMusic, onSelect }: StoryMusicPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && tracks.length === 0 && !query) {
      fetchTrending();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('music-search', { body: { type: 'trending' } });
      if (error) throw error;
      setTracks(data?.tracks || []);
    } catch (e) { console.error('Error fetching trending:', e); }
    finally { setLoading(false); }
  };

  const searchMusic = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) { fetchTrending(); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('music-search', { body: { query: searchQuery, type: 'search' } });
      if (error) throw error;
      setTracks(data?.tracks || []);
    } catch (e) { console.error('Error searching music:', e); }
    finally { setLoading(false); }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchMusic(value), 500);
  }, [searchMusic]);

  const togglePreview = useCallback((track: MusicTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(track.preview_url);
      audio.volume = 0.5;
      audio.play().catch(console.warn);
      audio.onended = () => setPlayingId(null);
      audioRef.current = audio;
      setPlayingId(track.id);
    }
  }, [playingId]);

  const handleSelect = useCallback((track: MusicTrack) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
    onSelect({
      title: track.title,
      artist: track.artist,
      previewUrl: track.preview_url,
      artworkUrl: track.artwork_url,
      startTime: 0,
      deezerId: track.provider === 'deezer' ? track.id : undefined,
    });
    setIsOpen(false);
  }, [onSelect]);

  const handleRemove = useCallback(() => { onSelect(null); }, [onSelect]);

  const handleClose = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
    setIsOpen(false);
  }, []);

  return (
    <>
      {selectedMusic ? (
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2.5 border border-white/10">
          <img src={selectedMusic.artworkUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{selectedMusic.title}</p>
            <p className="text-white/60 text-xs truncate">{selectedMusic.artist}</p>
          </div>
          <button onClick={() => setIsOpen(true)} className="text-white/70 hover:text-white p-1"><Music className="w-4 h-4" /></button>
          <button onClick={handleRemove} className="text-white/70 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/15 transition-all w-full border border-white/10">
          <Music className="w-5 h-5" />
          <span className="text-sm font-medium">მუსიკის დამატება</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md" onClick={handleClose}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl rounded-t-3xl max-h-[85vh] flex flex-col border-t border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="flex items-center justify-between px-4 pb-3">
                <h3 className="text-lg font-semibold text-foreground">მუსიკის არჩევა</h3>
                <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>

              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => handleQueryChange(e.target.value)}
                    placeholder="მოძებნე სიმღერა ან არტისტი..."
                    className="w-full pl-11 pr-4 py-3 bg-muted/60 backdrop-blur-sm rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 border border-white/5"
                    autoFocus
                  />
                </div>
              </div>

              {!query && (
                <div className="flex items-center gap-2 px-4 pb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ტრენდული</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : tracks.filter(t => t.preview_url).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">სიმღერა ვერ მოიძებნა</div>
                ) : (
                  tracks.filter(t => t.preview_url).map(track => (
                    <button
                      key={track.id}
                      onClick={() => handleSelect(track)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all",
                        selectedMusic?.previewUrl === track.preview_url
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-muted/60"
                      )}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                        {track.artwork_url && <img src={track.artwork_url} alt="" className="w-full h-full object-cover" />}
                        <button
                          onClick={e => { e.stopPropagation(); togglePreview(track); }}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          {playingId === track.id ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                        </button>
                        {playingId === track.id && (
                          <div className="absolute bottom-0.5 left-0.5 right-0.5 flex items-end justify-center gap-[2px] h-3">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: `${4 + Math.random() * 8}px`, animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default StoryMusicPicker;
