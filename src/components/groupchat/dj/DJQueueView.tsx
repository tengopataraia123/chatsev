import { memo, useState } from 'react';
import { ListMusic, Trash2, Play, Heart, User, Clock, Music2, Disc3, Crown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJQueueItem, DJTrack, DJ_ROOM_ID } from './types';

interface DJQueueViewProps {
  queue: DJQueueItem[];
  currentTrack: DJTrack | null;
  userId?: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

const DJQueueView = memo(({ queue, currentTrack, userId, isAdmin, onRefresh }: DJQueueViewProps) => {
  const [removing, setRemoving] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRemove = async (trackId: string) => {
    if (!userId) return;
    
    setRemoving(trackId);
    try {
      const { data, error } = await supabase.functions.invoke('dj-youtube', {
        body: {
          action: 'remove_from_queue',
          track_id: trackId,
          user_id: userId,
          room_id: DJ_ROOM_ID
        }
      });
      
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
        return;
      }
      
      toast({ title: 'ტრეკი წაიშალა რიგიდან' });
      onRefresh();
    } catch (e) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setRemoving(null);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const userQueueItems = queue.filter(q => q.track?.requested_by_user_id === userId);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/5 border border-border/50 backdrop-blur-sm">
      {/* Currently Playing */}
      {currentTrack && (
        <div className="p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 border-b border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30">
              <Play className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400">ახლა უკრავს</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {currentTrack.thumbnail_url ? (
                <img src={currentTrack.thumbnail_url} alt="" className="w-14 h-14 rounded-xl object-cover shadow-lg" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Disc3 className="w-6 h-6 text-green-400 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentTrack.title}</p>
              {currentTrack.artist && (
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              )}
              {currentTrack.requester_profile && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Heart className="w-3 h-3 text-pink-500" />
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={currentTrack.requester_profile.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]"><User className="w-2 h-2" /></AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-pink-400">{currentTrack.requester_profile.username}</span>
                </div>
              )}
            </div>
            {currentTrack.duration_ms && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDuration(currentTrack.duration_ms)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queue Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <ListMusic className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">რიგში მოლოდინე</h3>
            <p className="text-xs text-muted-foreground">{queue.length} სიმღერა</p>
          </div>
        </div>
        {userQueueItems.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Crown className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">შენი: {userQueueItems.length}</span>
          </div>
        )}
      </div>

      {/* Queue List */}
      <ScrollArea className="h-[280px]">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-4">
              <Music2 className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">რიგი ცარიელია</p>
            <p className="text-xs text-muted-foreground/60 mt-1">დაამატე პირველი სიმღერა!</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {queue.map((item, index) => {
              const isOwn = item.track?.requested_by_user_id === userId;
              const canRemove = isOwn || isAdmin;
              
              return (
                <div 
                  key={item.id} 
                  className={`relative p-3 rounded-xl transition-all duration-200 hover:scale-[1.01] ${
                    isOwn 
                      ? 'bg-gradient-to-r from-primary/10 to-pink-500/10 border border-primary/20 shadow-lg shadow-primary/5' 
                      : 'bg-background/50 border border-border/50 hover:bg-background/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Position */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      index === 0 
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/30' 
                        : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      <span className="text-sm">{index + 1}</span>
                    </div>
                    
                    {/* Thumbnail */}
                    {item.track?.thumbnail_url && (
                      <img 
                        src={item.track.thumbnail_url} 
                        alt="" 
                        className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-md"
                      />
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.track?.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.track?.artist && (
                          <p className="text-xs text-muted-foreground truncate">{item.track.artist}</p>
                        )}
                        {item.track?.duration_ms && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDuration(item.track.duration_ms)}
                          </span>
                        )}
                      </div>
                      {/* Requester */}
                      {item.track?.requester_profile && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={item.track.requester_profile.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px]"><User className="w-2 h-2" /></AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-muted-foreground">
                            {item.track.requester_profile.username}
                          </span>
                          {isOwn && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">შენ</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Remove Button */}
                    {canRemove && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemove(item.track?.id || '')}
                        disabled={removing === item.track?.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
});

DJQueueView.displayName = 'DJQueueView';

export default DJQueueView;
