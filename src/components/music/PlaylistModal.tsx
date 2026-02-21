import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Music, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  track_count?: number;
}

interface PlaylistModalProps {
  trackIdToAdd?: string;
  onClose: () => void;
  onPlaylistSelect?: (playlist: Playlist) => void;
  mode: 'add-to' | 'manage';
}

const PlaylistModal = ({ trackIdToAdd, onClose, onPlaylistSelect, mode }: PlaylistModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  const fetchPlaylists = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get track counts
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from('music_playlist_tracks')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);
          
          return { ...playlist, track_count: count || 0 };
        })
      );
      
      setPlaylists(playlistsWithCounts);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .insert({
          name: newPlaylistName.trim(),
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({ title: 'პლეილისტი შეიქმნა!' });
      setNewPlaylistName('');
      setShowCreateForm(false);
      
      // If adding a track, add it to the new playlist
      if (trackIdToAdd && data) {
        await addTrackToPlaylist(data.id);
      }
      
      fetchPlaylists();
    } catch (error: any) {
      toast({
        title: 'შეცდომა',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const addTrackToPlaylist = async (playlistId: string) => {
    if (!trackIdToAdd) return;
    
    try {
      // Get current max position
      const { data: existingTracks } = await supabase
        .from('music_playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);
      
      const newPosition = existingTracks?.[0]?.position ?? -1;
      
      const { error } = await supabase
        .from('music_playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: trackIdToAdd,
          position: newPosition + 1
        });
      
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'სიმღერა უკვე პლეილისტშია' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'დაემატა პლეილისტში!' });
        onClose();
      }
    } catch (error: any) {
      toast({
        title: 'შეცდომა',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('წაშალოთ პლეილისტი?')) return;
    
    try {
      const { error } = await supabase
        .from('music_playlists')
        .delete()
        .eq('id', playlistId);
      
      if (error) throw error;
      
      toast({ title: 'პლეილისტი წაიშალა' });
      fetchPlaylists();
    } catch (error: any) {
      toast({
        title: 'შეცდომა',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">
            {mode === 'add-to' ? 'პლეილისტში დამატება' : 'ჩემი პლეილისტები'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Create New */}
        <div className="p-4 border-b border-border">
          {showCreateForm ? (
            <div className="flex gap-2">
              <Input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="პლეილისტის სახელი"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim() || creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'შექმნა'}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              ახალი პლეილისტი
            </Button>
          )}
        </div>

        {/* Playlists */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>პლეილისტები არ გაქვთ</p>
              </div>
            ) : (
              playlists.map(playlist => (
                <div
                  key={playlist.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer group"
                  onClick={() => {
                    if (mode === 'add-to') {
                      addTrackToPlaylist(playlist.id);
                    } else if (onPlaylistSelect) {
                      onPlaylistSelect(playlist);
                    }
                  }}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {playlist.cover_url ? (
                      <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{playlist.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {playlist.track_count} სიმღერა
                    </p>
                  </div>
                  {mode === 'manage' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PlaylistModal;