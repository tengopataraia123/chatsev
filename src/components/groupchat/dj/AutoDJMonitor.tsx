import { memo } from 'react';
import { Bot, Music, Clock, CheckCircle, XCircle, User, Heart, Play } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DJQueueItem, DJRequest } from './types';

interface AutoDJMonitorProps {
  queue: DJQueueItem[];
  requests: DJRequest[];
  isAdmin: boolean;
}

const AutoDJMonitor = memo(({ queue, requests, isAdmin }: AutoDJMonitorProps) => {
  if (!isAdmin) return null;

  return (
    <div className="border border-border/50 rounded-lg bg-card/30 overflow-hidden">
      <div className="px-3 py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-medium">DJ ლ ო ლ ი ტ ა - მონიტორი</span>
          <div className="flex gap-1 ml-auto">
            <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 text-green-400 border-green-500/30">
              <Music className="w-3 h-3 mr-0.5" />
              რიგში: {queue.length}
            </Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="max-h-48">
        <div className="p-2 space-y-3">
          {/* Queue Section */}
          {queue.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Play className="w-3 h-3 text-green-400" />
                <span className="text-[10px] font-medium text-muted-foreground">რიგში ({queue.length})</span>
              </div>
              <div className="space-y-1">
                {queue.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 p-1.5 bg-secondary/30 rounded text-xs">
                    <span className="text-[10px] text-muted-foreground w-4 text-center">{index + 1}</span>
                    {item.track?.thumbnail_url && (
                      <img src={item.track.thumbnail_url} alt="" className="w-6 h-6 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] truncate">{item.track?.title}</p>
                      {item.track?.requester_profile && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Heart className="w-2.5 h-2.5 text-pink-400" />
                          <Avatar className="w-3 h-3">
                            <AvatarImage src={item.track.requester_profile.avatar_url || undefined} />
                            <AvatarFallback className="text-[6px]"><User className="w-2 h-2" /></AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] text-muted-foreground truncate">
                            {item.track.requester_profile.username}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {queue.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{queue.length - 5} სხვა
                  </p>
                )}
              </div>
            </div>
          )}

          {queue.length === 0 && (
            <div className="text-center py-3">
              <Bot className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">რიგი და შეკვეთები ცარიელია</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

AutoDJMonitor.displayName = 'AutoDJMonitor';

export default AutoDJMonitor;
