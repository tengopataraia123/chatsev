import { memo, useState, useEffect } from 'react';
import { 
  Shield, Settings, SkipForward, Trash2, 
  Play, Pause, Users, History, RefreshCw, Plus, Ban, Clock,
  Youtube, Save, Headphones, Disc3, Sliders, UserX, UserCheck, Music2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJRoomState, DJQueueItem, DJ_ROOM_ID } from './types';

interface DJAdminPanelProps {
  roomState: DJRoomState | null;
  queue: DJQueueItem[];
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onClearQueue: () => void;
  onRefresh: () => void;
}

interface PlayHistoryItem {
  id: string;
  title: string;
  artist: string | null;
  youtube_video_id: string | null;
  played_at: string;
  requested_by_user_id: string | null;
  requester_profile?: { username: string; avatar_url: string | null };
}

interface UserStats {
  user_id: string;
  current_queue_count: number;
  total_played: number;
  is_muted: boolean;
  muted_until: string | null;
  profile?: { username: string; avatar_url: string | null };
}

interface RoomSettings {
  max_queue_per_user: number;
  fallback_enabled: boolean;
  autoplay_enabled: boolean;
  round_robin_enabled: boolean;
}

const DJAdminPanel = memo(({ 
  roomState, queue, onPlay, onPause, onSkip, onClearQueue, onRefresh 
}: DJAdminPanelProps) => {
  const [history, setHistory] = useState<PlayHistoryItem[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [settings, setSettings] = useState<RoomSettings>({
    max_queue_per_user: 3,
    fallback_enabled: true,
    autoplay_enabled: true,
    round_robin_enabled: true
  });
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch history
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('dj_play_history')
        .select('*')
        .eq('room_id', DJ_ROOM_ID)
        .order('played_at', { ascending: false })
        .limit(20);
      
      if (data) {
        const userIds = data.filter(d => d.requested_by_user_id).map(d => d.requested_by_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        
        setHistory(data.map(item => ({
          ...item,
          requester_profile: item.requested_by_user_id 
            ? profileMap.get(item.requested_by_user_id) 
            : undefined
        })));
      }
    };
    fetchHistory();
  }, []);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('dj_user_queue_stats')
        .select('*')
        .eq('room_id', DJ_ROOM_ID)
        .order('total_played', { ascending: false });
      
      if (data) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        
        setUserStats(data.map(item => ({
          ...item,
          profile: profileMap.get(item.user_id)
        })));
      }
    };
    fetchStats();
  }, []);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('dj_room_settings')
        .select('*')
        .eq('room_id', DJ_ROOM_ID)
        .single();
      
      if (data) {
        setSettings({
          max_queue_per_user: data.max_queue_per_user || 3,
          fallback_enabled: data.fallback_enabled ?? true,
          autoplay_enabled: data.autoplay_enabled ?? true,
          round_robin_enabled: data.round_robin_enabled ?? true
        });
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await supabase
        .from('dj_room_settings')
        .upsert({
          room_id: DJ_ROOM_ID,
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'room_id' });
      
      toast({ title: 'პარამეტრები შენახულია' });
    } catch (e) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleMuteUser = async (userId: string, mute: boolean) => {
    try {
      await supabase
        .from('dj_user_queue_stats')
        .upsert({
          room_id: DJ_ROOM_ID,
          user_id: userId,
          is_muted: mute,
          muted_until: mute ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
        }, { onConflict: 'room_id,user_id' });
      
      setUserStats(prev => prev.map(s => 
        s.user_id === userId ? { ...s, is_muted: mute } : s
      ));
      
      toast({ title: mute ? 'მომხმარებელი დაბლოკილია' : 'ბლოკი მოხსნილია' });
    } catch (e) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleAddFallback = async () => {
    if (!fallbackUrl.trim()) return;
    
    const videoId = extractVideoId(fallbackUrl);
    if (!videoId) {
      toast({ title: 'არასწორი YouTube ლინკი', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const { data: info } = await supabase.functions.invoke('dj-youtube', {
        body: { action: 'get_info', url: fallbackUrl }
      });
      
      const { data: maxPos } = await supabase
        .from('dj_fallback_playlist')
        .select('position')
        .eq('room_id', DJ_ROOM_ID)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      await supabase
        .from('dj_fallback_playlist')
        .insert({
          room_id: DJ_ROOM_ID,
          youtube_video_id: videoId,
          title: info?.title || 'YouTube Video',
          artist: info?.channelTitle || null,
          thumbnail_url: info?.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          duration_ms: info?.durationMs || null,
          position: (maxPos?.position || 0) + 1
        });
      
      toast({ title: 'დაემატა ფოლბექ პლეილისტში' });
      setFallbackUrl('');
    } catch (e) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 via-purple-900/20 to-slate-900/50 border border-purple-500/20 backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                ადმინ პანელი
              </h3>
              <p className="text-xs text-muted-foreground">DJ Room მართვა</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onRefresh} className="h-9 w-9 hover:bg-purple-500/20">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Quick Controls */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-border/30">
        <Button
          size="sm"
          variant={roomState?.paused ? 'default' : 'outline'}
          onClick={roomState?.paused ? onPlay : onPause}
          className="h-9 gap-1.5"
        >
          {roomState?.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {roomState?.paused ? 'დაკვრა' : 'პაუზა'}
        </Button>
        <Button size="sm" variant="outline" onClick={onSkip} className="h-9 gap-1.5">
          <SkipForward className="w-4 h-4" />
          გამოტოვება
        </Button>
        <Button size="sm" variant="destructive" onClick={onClearQueue} className="h-9 gap-1.5">
          <Trash2 className="w-4 h-4" />
          რიგის გასუფთავება
        </Button>
      </div>
      
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="w-full justify-start h-12 rounded-none border-b border-border/30 bg-transparent px-2 gap-1">
          <TabsTrigger 
            value="settings" 
            className="text-xs h-9 px-3 gap-1.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-lg"
          >
            <Sliders className="w-3.5 h-3.5" /> პარამეტრები
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="text-xs h-9 px-3 gap-1.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-lg"
          >
            <Users className="w-3.5 h-3.5" /> მომხმარებლები
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="text-xs h-9 px-3 gap-1.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-lg"
          >
            <History className="w-3.5 h-3.5" /> ისტორია
          </TabsTrigger>
          <TabsTrigger 
            value="fallback" 
            className="text-xs h-9 px-3 gap-1.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-lg"
          >
            <Music2 className="w-3.5 h-3.5" /> ფოლბექი
          </TabsTrigger>
        </TabsList>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="p-4 space-y-4 m-0">
          <div className="space-y-4">
            {/* Max per user */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Music2 className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <Label className="text-sm font-medium">მაქსიმუმი მომხმარებელზე</Label>
                  <p className="text-xs text-muted-foreground">რამდენი სიმღერა შეიძლება რიგში</p>
                </div>
              </div>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings.max_queue_per_user}
                onChange={(e) => setSettings(prev => ({ ...prev, max_queue_per_user: parseInt(e.target.value) || 3 }))}
                className="w-20 h-9 text-center"
              />
            </div>
            
            {/* Autoplay */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Play className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <Label className="text-sm font-medium">ავტომატური დაკვრა</Label>
                  <p className="text-xs text-muted-foreground">შემდეგი ტრეკის ავტომატურად დაწყება</p>
                </div>
              </div>
              <Switch
                checked={settings.autoplay_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoplay_enabled: checked }))}
              />
            </div>
            
            {/* Round Robin */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Round-Robin რიგი</Label>
                  <p className="text-xs text-muted-foreground">სამართლიანი თანმიმდევრობა</p>
                </div>
              </div>
              <Switch
                checked={settings.round_robin_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, round_robin_enabled: checked }))}
              />
            </div>
            
            {/* Fallback */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Disc3 className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <Label className="text-sm font-medium">ფოლბექ პლეილისტი</Label>
                  <p className="text-xs text-muted-foreground">რიგის დაცარიელებისას</p>
                </div>
              </div>
              <Switch
                checked={settings.fallback_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, fallback_enabled: checked }))}
              />
            </div>
            
            <Button 
              onClick={handleSaveSettings} 
              disabled={loading} 
              className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              <Save className="w-4 h-4 mr-2" />
              შენახვა
            </Button>
          </div>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users" className="m-0">
          <ScrollArea className="h-[240px]">
            {userStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">მომხმარებლები არ არიან</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {userStats.map(stat => (
                  <div 
                    key={stat.user_id} 
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      stat.is_muted 
                        ? 'bg-red-500/10 border border-red-500/20' 
                        : 'bg-background/50 border border-border/50 hover:bg-background/80'
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={stat.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {stat.profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{stat.profile?.username || 'უცნობი'}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>რიგში: {stat.current_queue_count}</span>
                        <span>დაკვრილი: {stat.total_played}</span>
                      </div>
                    </div>
                    {stat.is_muted && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                        <Ban className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] text-red-400 font-medium">დაბლოკილი</span>
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant={stat.is_muted ? 'default' : 'outline'}
                      className="h-9 w-9"
                      onClick={() => handleMuteUser(stat.user_id, !stat.is_muted)}
                    >
                      {stat.is_muted ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="m-0">
          <ScrollArea className="h-[240px]">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <History className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">ისტორია ცარიელია</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {history.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                    {item.youtube_video_id && (
                      <img 
                        src={`https://img.youtube.com/vi/${item.youtube_video_id}/default.jpg`}
                        alt=""
                        className="w-12 h-9 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.requester_profile && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.requester_profile.username}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTime(item.played_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        {/* Fallback Tab */}
        <TabsContent value="fallback" className="p-4 space-y-3 m-0">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-orange-400">
              ფოლბექ პლეილისტი ჩაირთვება როცა მომხმარებლების რიგი ცარიელია.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="YouTube ლინკი..."
                value={fallbackUrl}
                onChange={(e) => setFallbackUrl(e.target.value)}
                className="h-11 pl-4 pr-12"
              />
              <Youtube className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            </div>
            <Button 
              onClick={handleAddFallback} 
              disabled={loading || !fallbackUrl.trim()} 
              className="h-11 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

DJAdminPanel.displayName = 'DJAdminPanel';

export default DJAdminPanel;
