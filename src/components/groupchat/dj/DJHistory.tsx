import { useState } from 'react';
import { Library, Play, Clock, Heart, Headphones, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DJTrack } from './types';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface DJHistoryProps {
  tracks: DJTrack[];
  onPlayTrack?: (track: DJTrack) => void;
  canPlay?: boolean;
  isDJ?: boolean;
}

const DJHistory = ({ tracks, onPlayTrack, canPlay = false }: DJHistoryProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter tracks that have been played (have created_at)
  const playedTracks = tracks.filter(t => t.created_at).slice(0, 50);

  if (playedTracks.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 h-9 px-3 text-sm border-t border-border/50"
        >
          <Library className="w-4 h-4" />
          <span>გასული სიმღერები ({playedTracks.length})</span>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="max-h-80 overflow-y-auto border-t border-border/30">
          <div className="p-2 pr-3 space-y-2">
            {playedTracks.map((track) => (
              <div 
                key={track.id} 
                className="p-2 pr-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {/* Thumbnail */}
                  {track.thumbnail_url && (
                    <img 
                      src={track.thumbnail_url} 
                      alt="" 
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className="text-sm font-medium truncate">{track.title}</p>
                    
                    {/* Time */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(track.created_at), { addSuffix: true, locale: ka })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Play Button */}
                  {onPlayTrack && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 flex-shrink-0 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => onPlayTrack(track)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                {/* Info row: Requester & DJ */}
                <div className="flex flex-wrap items-center gap-3 mt-2 ml-0">
                  {/* Requester info */}
                  {track.requester_profile && (
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-3 h-3 text-pink-500 flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground">შეკვეთა:</span>
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={track.requester_profile.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          <User className="w-2.5 h-2.5" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] font-medium text-pink-500">
                        {track.requester_profile.username}
                      </span>
                      {track.dedication && (
                        <span className="text-[10px] text-muted-foreground italic truncate max-w-[100px]">
                          "{track.dedication}"
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* DJ - Always show as DJ ლ ო ლ ი ტ ა */}
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-3 h-3 text-purple-500 flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground">DJ:</span>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                      DJ ლ ო ლ ი ტ ა
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DJHistory;