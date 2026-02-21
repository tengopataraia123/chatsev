import { memo, useState, useCallback } from 'react';
import { Plus, Youtube, Loader2, Music2, Heart, AlertCircle, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJ_ROOM_ID } from './types';

interface DJAddSongFormProps {
  userId?: string;
  onAdded: () => void;
  maxPerUser: number;
  currentCount: number;
}

const DJAddSongForm = memo(({ userId, onAdded, maxPerUser, currentCount }: DJAddSongFormProps) => {
  const [url, setUrl] = useState('');
  const [dedication, setDedication] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ title: string; thumbnail: string; channelTitle?: string } | null>(null);
  const { toast } = useToast();

  const extractVideoId = (input: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleUrlChange = useCallback(async (value: string) => {
    setUrl(value);
    setPreview(null);
    
    const videoId = extractVideoId(value);
    if (videoId) {
      setPreview({
        title: 'იტვირთება...',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      });
      
      try {
        const { data } = await supabase.functions.invoke('dj-youtube', {
          body: { action: 'get_info', url: value }
        });
        if (data?.title) {
          setPreview({
            title: data.title,
            thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            channelTitle: data.channelTitle
          });
        }
      } catch (e) {}
    }
  }, []);

  const handleSubmit = async () => {
    if (!userId || !url.trim()) return;
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      toast({ title: 'არასწორი YouTube ლინკი', variant: 'destructive' });
      return;
    }
    
    if (currentCount >= maxPerUser) {
      toast({ title: `მაქსიმუმ ${maxPerUser} სიმღერა შეგიძლიათ რიგში`, variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dj-youtube', {
        body: {
          action: 'add_to_queue',
          url: url.trim(),
          user_id: userId,
          room_id: DJ_ROOM_ID,
          dedication: dedication.trim() || null
        }
      });
      
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
        return;
      }
      
      const message = data?.started_playing 
        ? `🎵 ${data.title} - დაიწყო დაკვრა!`
        : `✅ ${data.title} - პოზიცია: #${data.position}`;
      
      toast({ title: message });
      setUrl('');
      setDedication('');
      setPreview(null);
      onAdded();
    } catch (e) {
      toast({ title: 'შეცდომა დამატებისას', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const remaining = maxPerUser - currentCount;
  const canAdd = remaining > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/5 border border-border/50 backdrop-blur-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">სიმღერის შეკვეთა</h3>
            <p className="text-xs text-muted-foreground">დაამატე YouTube ლინკი</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
          remaining > 0 
            ? 'bg-green-500/10 border border-green-500/20' 
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <Sparkles className={`w-3 h-3 ${remaining > 0 ? 'text-green-400' : 'text-red-400'}`} />
          <span className={`text-xs font-medium ${remaining > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {remaining}/{maxPerUser}
          </span>
        </div>
      </div>
      
      {/* Limit Warning */}
      {!canAdd && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">ლიმიტი ამოწურულია</p>
            <p className="text-xs text-red-400/70">დაელოდე შენი სიმღერების დაკვრას</p>
          </div>
        </div>
      )}
      
      {/* Preview Card */}
      {preview && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 animate-fade-in">
          <div className="relative shrink-0">
            <img 
              src={preview.thumbnail} 
              alt="" 
              className="w-20 h-14 rounded-lg object-cover shadow-lg"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/50 to-transparent" />
            <Youtube className="absolute bottom-1 right-1 w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{preview.title}</p>
            {preview.channelTitle && (
              <p className="text-xs text-muted-foreground truncate">{preview.channelTitle}</p>
            )}
          </div>
        </div>
      )}
      
      {/* URL Input */}
      <div className="relative">
        <Input
          placeholder="YouTube ლინკი ჩასვი აქ..."
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="h-12 pl-4 pr-12 text-sm bg-background/50 border-border/50 rounded-xl focus:ring-2 focus:ring-pink-500/30"
          disabled={loading || !canAdd}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Youtube className="w-4 h-4 text-red-500" />
        </div>
      </div>
      
      {/* Dedication & Submit */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="💝 მიძღვნა (არჩევითი)"
            value={dedication}
            onChange={(e) => setDedication(e.target.value)}
            className="h-11 pl-4 pr-10 text-sm bg-background/50 border-border/50 rounded-xl"
            disabled={loading || !canAdd}
          />
          <Heart className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!url.trim() || loading || !canAdd}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              გაგზავნა
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

DJAddSongForm.displayName = 'DJAddSongForm';

export default DJAddSongForm;
