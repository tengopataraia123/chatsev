import { useState, useEffect } from 'react';
import { Send, Music, Heart, Link, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DJRequestFormProps {
  onSubmit: (request: { 
    song_title: string; 
    artist?: string; 
    youtube_link?: string; 
    dedication?: string; 
    message?: string 
  }) => Promise<{ success: boolean; error?: string }>;
}

// Extract YouTube video ID
const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const DJRequestForm = ({ onSubmit }: DJRequestFormProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [request, setRequest] = useState({
    song_title: '',
    artist: '',
    youtube_link: '',
    dedication: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const { toast } = useToast();

  // Auto-fetch YouTube info when link changes (check both youtube_link and song_title fields)
  useEffect(() => {
    const fetchYoutubeInfo = async () => {
      // Check both fields for YouTube links
      const youtubeLink = request.youtube_link.trim();
      const songTitleLink = request.song_title.trim();
      
      // Try to extract video ID from either field
      let link = '';
      let videoId = extractYoutubeId(youtubeLink);
      if (videoId) {
        link = youtubeLink;
      } else {
        videoId = extractYoutubeId(songTitleLink);
        if (videoId) {
          link = songTitleLink;
        }
      }
      
      if (!videoId) return;
      
      // Don't fetch if we already have proper title (not a link) and artist filled
      const hasProperTitle = request.song_title && !extractYoutubeId(request.song_title);
      const hasArtist = request.artist;
      if (hasProperTitle && hasArtist) return;
      
      setFetchingInfo(true);
      try {
        const { data, error } = await supabase.functions.invoke('youtube-info', {
          body: { url: link }
        });
        
        if (data && !error) {
          setRequest(prev => ({
            ...prev,
            song_title: data.title || prev.song_title || '',
            artist: data.artist || data.channelName || prev.artist || '',
            youtube_link: link // Ensure link is in proper field
          }));
        }
      } catch (e) {
        console.error('Error fetching YouTube info:', e);
      } finally {
        setFetchingInfo(false);
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchYoutubeInfo, 500);
    return () => clearTimeout(timeoutId);
  }, [request.youtube_link, request.song_title]);

  const handleSubmit = async () => {
    // Allow submit if either song_title or youtube_link is provided
    if (!request.song_title.trim() && !request.youtube_link.trim()) return;
    
    setLoading(true);
    try {
      const result = await onSubmit({
        song_title: request.song_title.trim() || 'YouTube Video',
        artist: request.artist.trim() || undefined,
        youtube_link: request.youtube_link.trim() || undefined,
        dedication: request.dedication.trim() || undefined,
        message: request.message.trim() || undefined
      });
      
      if (result.success) {
        setRequest({ song_title: '', artist: '', youtube_link: '', dedication: '', message: '' });
        setIsExpanded(false);
        toast({ title: 'შეკვეთა გაიგზავნა!' });
      } else {
        toast({ title: result.error || 'შეცდომა', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 py-2 border-t border-border/50 bg-card/30">
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="flex gap-2">
            <Input
              placeholder="🎵 შეუკვეთე სიმღერა DJ-ს..."
              value={request.song_title}
              onChange={(e) => setRequest(prev => ({ ...prev, song_title: e.target.value }))}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={(e) => {
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                if (e.key === 'Enter' && !isExpanded && !isMobile) handleSubmit();
              }}
              className="h-9 text-sm"
            />
            <Button 
              size="icon" 
              className="h-9 w-9 flex-shrink-0" 
              onClick={handleSubmit}
              disabled={loading || (!request.song_title.trim() && !request.youtube_link.trim())}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {isExpanded && (
            <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <Music className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="სიმღერის სახელი"
                      value={request.song_title}
                      onChange={(e) => setRequest(prev => ({ ...prev, song_title: e.target.value }))}
                      className="h-8 text-sm pl-8"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Music className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="შემსრულებელი"
                      value={request.artist}
                      onChange={(e) => setRequest(prev => ({ ...prev, artist: e.target.value }))}
                      className="h-8 text-sm pl-8"
                    />
                  </div>
                </div>
              </div>
              <div className="relative">
                <Heart className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="ვინისთვის მიძღვნა? (optional)"
                  value={request.dedication}
                  onChange={(e) => setRequest(prev => ({ ...prev, dedication: e.target.value }))}
                  className="h-8 text-sm pl-8"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsExpanded(false)}
                  className="text-xs"
                >
                  დახურვა
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DJRequestForm;
