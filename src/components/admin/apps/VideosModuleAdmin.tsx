import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, Video, Search, Trash2, Loader2, Eye, Play, TrendingUp } from 'lucide-react';

interface VideoItem {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  description: string | null;
  views: number;
  created_at: string;
  profile?: { username: string; avatar_url: string | null };
}

interface VideosModuleAdminProps {
  onBack: () => void;
}

export default function VideosModuleAdmin({ onBack }: VideosModuleAdminProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalVideos: 0, todayVideos: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: reelsData } = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const { count: totalCount } = await supabase.from('reels').select('id', { count: 'exact', head: true });
    const { count: todayCount } = await supabase.from('reels').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString());

    if (reelsData) {
      const userIds = [...new Set(reelsData.map(v => v.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);

      setVideos(reelsData.map(video => ({
        ...video,
        profile: profiles?.find(p => p.user_id === video.user_id)
      })));
      setStats({ totalVideos: totalCount || 0, todayVideos: todayCount || 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('წაშლა?')) return;
    await supabase.from('reels').delete().eq('id', id);
    toast({ title: 'წაიშალა' });
    fetchData();
  };

  const filteredVideos = videos.filter(v => v.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Video className="h-6 w-6 text-purple-500" />ვიდეოები</h2>
          <p className="text-sm text-muted-foreground">მართე ვიდეოები</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card><CardContent className="p-3 text-center"><Video className="h-5 w-5 mx-auto text-purple-500 mb-1" /><p className="text-lg font-bold">{stats.totalVideos}</p><p className="text-xs text-muted-foreground">სულ</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" /><p className="text-lg font-bold">{stats.todayVideos}</p><p className="text-xs text-muted-foreground">დღეს</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ძებნა..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-2">
          {filteredVideos.map(video => (
            <Card key={video.id}>
              <CardContent className="p-3 flex gap-3">
                <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Play className="h-6 w-6 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-5 w-5"><AvatarImage src={video.profile?.avatar_url || ''} /><AvatarFallback className="text-[10px]">{video.profile?.username?.[0]}</AvatarFallback></Avatar>
                    <span className="text-sm font-medium truncate">{video.profile?.username}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs flex items-center gap-1"><Eye className="h-3 w-3" />{video.views || 0}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(video.created_at), 'dd.MM.yy')}</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDelete(video.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {filteredVideos.length === 0 && <p className="text-center text-muted-foreground py-8">არ მოიძებნა</p>}
        </div>
      </ScrollArea>
    </div>
  );
}
