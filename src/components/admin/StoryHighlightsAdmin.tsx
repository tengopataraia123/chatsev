import { memo, useState, useEffect, useCallback } from 'react';
import { Star, StarOff, Trash2, Eye, Heart, MessageCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface StoryWithProfile {
  id: string;
  user_id: string;
  story_type: string;
  image_url: string | null;
  video_url: string | null;
  content: string | null;
  is_highlighted: boolean;
  created_at: string;
  expires_at: string;
  total_views: number;
  unique_views: number;
  total_reactions: number;
  total_replies: number;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

const StoryHighlightsAdmin = memo(function StoryHighlightsAdmin() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<StoryWithProfile[]>([]);
  const [highlights, setHighlights] = useState<StoryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'highlights'>('all');

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const fetchStories = useCallback(async () => {
    if (!isAdmin) return;

    try {
      // Fetch all active stories
      const { data: allStories, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (storiesError) throw storiesError;

      // Fetch profiles
      if (allStories && allStories.length > 0) {
        const userIds = [...new Set(allStories.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const storiesWithProfiles = allStories.map(s => ({
          ...s,
          profile: profileMap.get(s.user_id)
        })) as StoryWithProfile[];

        setStories(storiesWithProfiles.filter(s => !s.is_highlighted));
        setHighlights(storiesWithProfiles.filter(s => s.is_highlighted));
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleHighlight = async (storyId: string, highlight: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_highlight_story', {
        p_story_id: storyId,
        p_highlight: highlight
      });

      if (error) throw error;

      toast({
        title: highlight ? 'დაემატა Highlight-ში' : 'მოიხსნა Highlight-დან',
        description: highlight 
          ? 'სთორი აღარ წაიშლება ავტომატურად'
          : 'სთორი წაიშლება 24 საათში'
      });

      fetchStories();
    } catch (error) {
      console.error('Error highlighting story:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDelete = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      toast({ title: 'წაიშალა' });
      fetchStories();
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return null;
  }

  const StoryCard = ({ story }: { story: StoryWithProfile }) => (
    <Card className="overflow-hidden">
      <div className="relative aspect-[9/16] bg-muted">
        {story.image_url && (
          <img src={story.image_url} alt="" className="w-full h-full object-cover" />
        )}
        {story.video_url && (
          <video src={story.video_url} className="w-full h-full object-cover" muted />
        )}
        {story.story_type === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <p className="text-white text-center text-sm line-clamp-6">{story.content}</p>
          </div>
        )}
        
        {story.is_highlighted && (
          <Badge className="absolute top-2 right-2 bg-yellow-500">
            <Star className="w-3 h-3 mr-1" />
            Highlight
          </Badge>
        )}
      </div>
      
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={story.profile?.avatar_url || ''} />
            <AvatarFallback>{story.profile?.username?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{story.profile?.username}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: ka })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {story.unique_views || 0}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {story.total_reactions || 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> {story.total_replies || 0}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={story.is_highlighted ? "secondary" : "default"}
            size="sm"
            className="flex-1"
            onClick={() => handleHighlight(story.id, !story.is_highlighted)}
          >
            {story.is_highlighted ? (
              <>
                <StarOff className="w-4 h-4 mr-1" />
                მოხსნა
              </>
            ) : (
              <>
                <Star className="w-4 h-4 mr-1" />
                Highlight
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(story.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="w-5 h-5 text-yellow-500" />
            სთორის Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'highlights')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="all">
                ყველა სთორი ({stories.length})
              </TabsTrigger>
              <TabsTrigger value="highlights">
                Highlights ({highlights.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  აქტიური სთორი არ არის
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {stories.map(story => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="highlights" className="mt-0">
              {highlights.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Highlight სთორი არ არის
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {highlights.map(story => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

export default StoryHighlightsAdmin;
