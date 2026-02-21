import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Headphones, Upload, Youtube, ListMusic, Inbox, 
  Play, Pause, SkipForward, Square, Plus, Trash2, 
  CheckCircle, X, GripVertical, Settings, Radio, Heart, User
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DJRoomState, DJTrack, DJQueueItem, DJRequest } from './types';

interface DJPanelProps {
  roomState: DJRoomState | null;
  queue: DJQueueItem[];
  tracks: DJTrack[];
  requests: DJRequest[];
  currentPosition: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (positionMs: number) => void;
  onStop: () => void;
  onSetSource: (track: DJTrack | null, youtubeVideoId?: string) => void;
  onSetMode: (mode: 'stream' | 'embed') => void;
  onAddTrack: (track: Omit<DJTrack, 'id' | 'room_id' | 'created_at' | 'created_by'>) => Promise<DJTrack | null>;
  onAddToQueue: (trackId: string, addToFirst?: boolean) => Promise<boolean>;
  onRemoveFromQueue: (queueItemId: string) => void;
  onHandleRequest: (requestId: string, action: 'accepted' | 'rejected', reason?: string) => void;
}

const DJPanel = ({
  roomState,
  queue,
  tracks,
  requests,
  currentPosition,
  onPlay,
  onPause,
  onSeek,
  onStop,
  onSetSource,
  onSetMode,
  onAddTrack,
  onAddToQueue,
  onRemoveFromQueue,
  onHandleRequest
}: DJPanelProps) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [newTrack, setNewTrack] = useState({ title: '', artist: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const extractYoutubeId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddYoutube = async () => {
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      toast({ title: 'არასწორი YouTube ლინკი', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      // Create track and play immediately
      const track = await onAddTrack({
        source_type: 'youtube',
        title: newTrack.title || `YouTube - ${videoId}`,
        artist: newTrack.artist || null,
        url: null,
        youtube_video_id: videoId,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration_ms: null,
        requested_by_user_id: null,
        dedication: null
      });
      
      if (track) {
        onSetSource(track);
        setYoutubeUrl('');
        setNewTrack({ title: '', artist: '' });
        toast({ title: 'YouTube ტრეკი დაემატა და დაიწყო' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNow = (track: DJTrack) => {
    onSetSource(track);
  };

  const handleAcceptRequest = async (request: DJRequest) => {
    setLoading(true);
    try {
      // Check for YouTube link in youtube_link field OR in song_title field
      const youtubeLink = request.youtube_link || request.song_title;
      const videoId = youtubeLink ? extractYoutubeId(youtubeLink) : null;
      
      if (videoId) {
        let title = request.song_title;
        let artist = request.artist || null;
        
        // If song_title is a URL or we don't have proper info, fetch from YouTube
        const songTitleIsUrl = extractYoutubeId(request.song_title);
        if (songTitleIsUrl || !artist) {
          try {
            const { data } = await supabase.functions.invoke('youtube-info', {
              body: { url: youtubeLink }
            });
            
            if (data) {
              title = data.title || `YouTube - ${videoId}`;
              artist = data.artist || data.channelName || null;
            }
          } catch (e) {
            console.error('Error fetching YouTube info:', e);
            // Fallback to generic title if fetch fails
            if (songTitleIsUrl) {
              title = `YouTube - ${videoId}`;
            }
          }
        }
        
        const track = await onAddTrack({
          source_type: 'youtube',
          title: title,
          artist: artist,
          url: null,
          youtube_video_id: videoId,
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          duration_ms: null,
          requested_by_user_id: request.from_user_id,
          dedication: request.dedication || null
        });
        
        if (track) {
          const added = await onAddToQueue(track.id);
          if (added) {
            toast({ title: 'სიმღერა დაემატა რიგში', description: title });
          } else {
            toast({ title: 'შეცდომა რიგში დამატებისას', variant: 'destructive' });
          }
        } else {
          toast({ title: 'შეცდომა ტრეკის დამატებისას', variant: 'destructive' });
        }
      } else {
        toast({ title: 'შეკვეთა მიღებულია (ლინკი არ არის)', description: request.song_title });
      }
      
      onHandleRequest(request.id, 'accepted');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border-b border-border bg-card/50 w-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">DJ Panel</span>
        </div>
        {requests.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {requests.length} შეკვეთა
          </Badge>
        )}
      </div>
      
      {/* Playback Controls */}
      <div className="px-2 py-2 border-b border-border/50 space-y-2">
        {/* Top row: Play controls and time */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={roomState?.paused ? onPlay : onPause}
          >
            {roomState?.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onStop}>
            <Square className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <SkipForward className="w-4 h-4" />
          </Button>
          
          <span className="text-xs text-muted-foreground ml-1 shrink-0">{formatTime(currentPosition)}</span>
          
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <Label className="text-xs">Mode:</Label>
            <Button
              variant={roomState?.mode === 'embed' ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => onSetMode('embed')}
            >
              Embed
            </Button>
            <Button
              variant={roomState?.mode === 'stream' ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => onSetMode('stream')}
            >
              Stream
            </Button>
          </div>
        </div>
        
        {/* Slider row - full width */}
        <div className="w-full">
          <Slider
            value={[currentPosition / 1000]}
            max={300}
            step={1}
            onValueChange={(v) => onSeek(v[0] * 1000)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="youtube" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full justify-start h-10 rounded-none border-b border-border/50 bg-transparent px-2 gap-0.5">
            <TabsTrigger value="youtube" className="text-[11px] h-7 px-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Youtube className="w-3 h-3 mr-0.5" /> YouTube
            </TabsTrigger>
            <TabsTrigger value="queue" className="text-[11px] h-7 px-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <ListMusic className="w-3 h-3 mr-0.5" /> Queue ({queue.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-[11px] h-7 px-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Inbox className="w-3 h-3 mr-0.5" /> Requests ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="library" className="text-[11px] h-7 px-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Radio className="w-3 h-3 mr-0.5" /> Library
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* YouTube Tab */}
        <TabsContent value="youtube" className="p-3 space-y-2 m-0">
          <Input
            placeholder="YouTube ლინკი ან Video ID"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="h-9 text-sm border-border/60 bg-background/50 placeholder:text-muted-foreground/70"
          />
          <div className="flex gap-2">
            <Input
              placeholder="სათაური (optional)"
              value={newTrack.title}
              onChange={(e) => setNewTrack(prev => ({ ...prev, title: e.target.value }))}
              className="h-8 text-sm flex-1"
            />
            <Input
              placeholder="შემსრულებელი"
              value={newTrack.artist}
              onChange={(e) => setNewTrack(prev => ({ ...prev, artist: e.target.value }))}
              className="h-8 text-sm flex-1"
            />
          </div>
          <Button 
            size="sm" 
            onClick={handleAddYoutube} 
            disabled={!youtubeUrl || loading}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-1" />
            დაკვრა
          </Button>
        </TabsContent>
        
        {/* Queue Tab */}
        <TabsContent value="queue" className="m-0 w-full overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                რიგი ცარიელია
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {queue.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="p-2 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab shrink-0" />
                      <span className="text-[10px] text-muted-foreground shrink-0 w-3">{index + 1}</span>
                      {item.track?.thumbnail_url && (
                        <img 
                          src={item.track.thumbnail_url} 
                          alt="" 
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.track?.title}</p>
                        {item.track?.artist && (
                          <p className="text-[10px] text-muted-foreground truncate">{item.track.artist}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => item.track && handlePlayNow(item.track)}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-destructive"
                        onClick={() => onRemoveFromQueue(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {/* Requester info - second row */}
                    {item.track?.requester_profile && (
                      <div className="flex items-center gap-1 mt-1 ml-8">
                        <Heart className="w-2.5 h-2.5 text-pink-500 shrink-0" />
                        <Avatar className="w-3.5 h-3.5 shrink-0">
                          <AvatarImage src={item.track.requester_profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[6px]">
                            <User className="w-2 h-2" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[9px] text-muted-foreground truncate">
                          {item.track.requester_profile.username}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Requests Tab */}
        <TabsContent value="requests" className="m-0 w-full overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                შეკვეთები არ არის
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {requests.map((request) => (
                  <div 
                    key={request.id} 
                    className="p-2 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{request.song_title}</p>
                        {request.artist && (
                          <p className="text-[10px] text-muted-foreground truncate">{request.artist}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {request.profile?.username}
                        </p>
                        {request.dedication && (
                          <p className="text-[10px] text-primary mt-1 truncate">💝 {request.dedication}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-green-500"
                        onClick={() => handleAcceptRequest(request)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-destructive"
                        onClick={() => onHandleRequest(request.id, 'rejected')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Library Tab */}
        <TabsContent value="library" className="m-0 w-full overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {tracks.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                ბიბლიოთეკა ცარიელია
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {tracks.map((track) => (
                  <div 
                    key={track.id} 
                    className="p-2 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      {track.thumbnail_url && (
                        <img 
                          src={track.thumbnail_url} 
                          alt="" 
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{track.title}</p>
                        {track.artist && (
                          <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handlePlayNow(track)}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => onAddToQueue(track.id)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    {/* Requester info - second row */}
                    {track.requester_profile && (
                      <div className="flex items-center gap-1 mt-1 ml-10">
                        <Heart className="w-2.5 h-2.5 text-pink-500 shrink-0" />
                        <Avatar className="w-3.5 h-3.5 shrink-0">
                          <AvatarImage src={track.requester_profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[6px]">
                            <User className="w-2 h-2" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[9px] text-muted-foreground truncate">
                          {track.requester_profile.username}
                        </span>
                        {track.dedication && (
                          <span className="text-[9px] text-pink-500/80 truncate">
                            — "{track.dedication}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DJPanel;
