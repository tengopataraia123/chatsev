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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Image,
  Search,
  Trash2,
  Loader2,
  TrendingUp,
  Heart,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface Photo {
  id: string;
  user_id: string;
  image_url: string;
  content: string | null;
  likes_count: number;
  created_at: string;
  is_approved: boolean;
  profile?: { username: string; avatar_url: string | null };
}

interface PhotosModuleAdminProps {
  onBack: () => void;
}

export default function PhotosModuleAdmin({ onBack }: PhotosModuleAdminProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [stats, setStats] = useState({ 
    totalPhotos: 0, 
    pendingPhotos: 0, 
    approvedPhotos: 0,
    totalLikes: 0 
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch photos with images
    const { data: postsData } = await supabase
      .from('posts')
      .select('id, user_id, image_url, content, created_at, is_approved')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    const { count: totalCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .not('image_url', 'is', null);

    const { count: pendingCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .not('image_url', 'is', null)
      .eq('is_approved', false);

    const { count: approvedCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .not('image_url', 'is', null)
      .eq('is_approved', true);

    if (postsData) {
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      // Get likes count
      const photoIds = postsData.map(p => p.id);
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', photoIds);

      const likesMap = new Map<string, number>();
      likesData?.forEach(l => {
        likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1);
      });

      const photosWithData = postsData.map(post => ({
        ...post,
        is_approved: post.is_approved ?? false,
        profile: profiles?.find(p => p.user_id === post.user_id),
        likes_count: likesMap.get(post.id) || 0
      }));

      setPhotos(photosWithData);
      setStats({
        totalPhotos: totalCount || 0,
        pendingPhotos: pendingCount || 0,
        approvedPhotos: approvedCount || 0,
        totalLikes: likesData?.length || 0
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ფოტოს წაშლა?')) return;
    
    await supabase.from('posts').delete().eq('id', id);
    toast({ title: 'ფოტო წაიშალა' });
    setPhotos(prev => prev.filter(p => p.id !== id));
    setStats(prev => ({
      ...prev,
      totalPhotos: prev.totalPhotos - 1,
    }));
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('posts')
      .update({ is_approved: true })
      .eq('id', id);

    if (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
      return;
    }

    toast({ title: 'ფოტო დადასტურდა' });
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, is_approved: true } : p));
    setStats(prev => ({
      ...prev,
      pendingPhotos: prev.pendingPhotos - 1,
      approvedPhotos: prev.approvedPhotos + 1,
    }));
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('posts')
      .update({ is_approved: false })
      .eq('id', id);

    if (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
      return;
    }

    toast({ title: 'ფოტო უარყოფილია' });
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, is_approved: false } : p));
    setStats(prev => ({
      ...prev,
      pendingPhotos: prev.pendingPhotos + 1,
      approvedPhotos: prev.approvedPhotos - 1,
    }));
  };

  const filteredPhotos = photos.filter(p => {
    const matchesSearch = 
      p.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'pending') return matchesSearch && !p.is_approved;
    if (activeTab === 'approved') return matchesSearch && p.is_approved;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Image className="h-6 w-6 text-green-500" />
            ფოტოების მართვა
          </h2>
          <p className="text-sm text-muted-foreground">მართე ფოტო კონტენტი</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <Image className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{stats.totalPhotos}</p>
            <p className="text-xs text-muted-foreground">სულ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{stats.pendingPhotos}</p>
            <p className="text-xs text-muted-foreground">მოლოდინში</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{stats.approvedPhotos}</p>
            <p className="text-xs text-muted-foreground">დადასტურ.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Heart className="h-5 w-5 mx-auto text-pink-500 mb-1" />
            <p className="text-lg font-bold">{stats.totalLikes}</p>
            <p className="text-xs text-muted-foreground">მოწონება</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">ყველა</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            მოლოდინში
            {stats.pendingPhotos > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {stats.pendingPhotos}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">დადასტურებული</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ძებნა..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Photos Grid */}
      <ScrollArea className="h-[calc(100vh-450px)]">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredPhotos.map(photo => (
            <Card key={photo.id} className={`overflow-hidden ${!photo.is_approved ? 'ring-2 ring-yellow-500/50' : ''}`}>
              <div className="relative aspect-square">
                <img 
                  src={photo.image_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                {/* Status badge */}
                <div className="absolute top-1 left-1">
                  {photo.is_approved ? (
                    <Badge variant="default" className="bg-green-500 text-xs px-1.5 py-0.5">
                      <CheckCircle className="h-3 w-3 mr-0.5" />
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-500 text-black text-xs px-1.5 py-0.5">
                      <Clock className="h-3 w-3 mr-0.5" />
                    </Badge>
                  )}
                </div>
                
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={photo.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">{photo.profile?.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-white font-medium truncate flex-1">
                        {photo.profile?.username}
                      </span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-1">
                      {!photo.is_approved ? (
                        <Button 
                          size="sm" 
                          className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(photo.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          დადასტურება
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleReject(photo.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          უარყოფა
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="h-7 w-7"
                        onClick={() => handleDelete(photo.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="h-3 w-3" />
                    <span className="text-xs">{photo.likes_count}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(photo.created_at), 'dd.MM.yy')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredPhotos.length === 0 && (
          <p className="text-center text-muted-foreground py-8">ფოტოები არ მოიძებნა</p>
        )}
      </ScrollArea>
    </div>
  );
}
