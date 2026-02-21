import { X, GripVertical, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MusicTrack } from './ModernMusicPlayer';

interface MusicQueueProps {
  queue: MusicTrack[];
  currentTrack: MusicTrack | null;
  currentIndex: number;
  onTrackSelect: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onClose: () => void;
}

const MusicQueue = ({
  queue,
  currentTrack,
  currentIndex,
  onTrackSelect,
  onRemoveFromQueue,
  onClearQueue,
  onClose,
}: MusicQueueProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-bold">დასაკრავი რიგი</h2>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearQueue}>
              <Trash2 className="w-4 h-4 mr-1" />
              გასუფთავება
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div className="p-4 bg-primary/10 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">ახლა უკრავს</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 overflow-hidden flex-shrink-0">
              {currentTrack.cover_url ? (
                <img src={currentTrack.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">♪</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{currentTrack.title}</p>
              <p className="text-sm text-muted-foreground truncate">{currentTrack.artist || 'უცნობი'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>რიგი ცარიელია</p>
              <p className="text-sm mt-1">დაამატეთ სიმღერები დასაკრავად</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                შემდეგი ({queue.length - currentIndex - 1} სიმღერა)
              </p>
              <div className="space-y-1">
                {queue.map((track, index) => {
                  if (index <= currentIndex) return null;
                  return (
                    <div 
                      key={`${track.id}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      
                      <div 
                        className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => onTrackSelect(index)}
                      >
                        {track.cover_url ? (
                          <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-sm font-bold text-muted-foreground">♪</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTrackSelect(index)}>
                        <p className="font-medium truncate text-sm">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist || 'უცნობი'}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveFromQueue(index)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {currentIndex > 0 && (
                <>
                  <p className="text-sm text-muted-foreground mt-6 mb-3">
                    უკვე დაიკრა ({currentIndex} სიმღერა)
                  </p>
                  <div className="space-y-1 opacity-60">
                    {queue.slice(0, currentIndex).map((track, index) => (
                      <div 
                        key={`${track.id}-${index}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => onTrackSelect(index)}
                      >
                        <div className="w-4" />
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                          {track.cover_url ? (
                            <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-sm font-bold text-muted-foreground">♪</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist || 'უცნობი'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MusicQueue;