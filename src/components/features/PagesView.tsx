import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Heart, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Page {
  id: string;
  name: string;
  description: string | null;
  category: string;
  cover_url: string | null;
  avatar_url: string | null;
  owner_id: string;
  followers_count: number;
  is_following?: boolean;
}

interface PagesViewProps {
  onBack: () => void;
}

const categories = [
  { value: 'business', label: 'ბიზნესი' },
  { value: 'entertainment', label: 'გართობა' },
  { value: 'education', label: 'განათლება' },
  { value: 'news', label: 'ახალი ამბები' },
  { value: 'sports', label: 'სპორტი' },
  { value: 'other', label: 'სხვა' },
];

const PagesView = ({ onBack }: PagesViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('followers_count', { ascending: false });

    if (error) {
      console.error('Error fetching pages:', error);
      setLoading(false);
      return;
    }

    // Check if user follows each page
    const pagesWithFollowing = await Promise.all((data || []).map(async (page) => {
      let isFollowing = false;
      if (user) {
        const { data: follow } = await supabase
          .from('page_followers')
          .select('id')
          .eq('page_id', page.id)
          .eq('user_id', user.id)
          .maybeSingle();
        isFollowing = !!follow;
      }
      return { ...page, is_following: isFollowing };
    }));

    setPages(pagesWithFollowing);
    setLoading(false);
  };

  const handleCreatePage = async () => {
    if (!newName.trim() || !user) return;

    const { error } = await supabase
      .from('pages')
      .insert({
        name: newName,
        description: newDescription || null,
        category: newCategory,
        owner_id: user.id
      });

    if (error) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'გვერდი შეიქმნა!' });
    setNewName('');
    setNewDescription('');
    setNewCategory('other');
    setShowCreateForm(false);
    fetchPages();
  };

  const handleFollowPage = async (page: Page) => {
    if (!user) return;

    if (page.is_following) {
      const { error } = await supabase
        .from('page_followers')
        .delete()
        .eq('page_id', page.id)
        .eq('user_id', user.id);

      if (error) {
        toast({ title: 'შეცდომა', variant: 'destructive' });
        return;
      }

      // Update followers count
      await supabase
        .from('pages')
        .update({ followers_count: Math.max(0, page.followers_count - 1) })
        .eq('id', page.id);

      toast({ title: 'Unfollowed' });
    } else {
      const { error } = await supabase
        .from('page_followers')
        .insert({
          page_id: page.id,
          user_id: user.id
        });

      if (error) {
        toast({ title: 'შეცდომა', variant: 'destructive' });
        return;
      }

      // Update followers count
      await supabase
        .from('pages')
        .update({ followers_count: page.followers_count + 1 })
        .eq('id', page.id);

      toast({ title: 'Started following!' });
    }

    fetchPages();
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">გვერდები</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-1" />
          შექმნა
        </Button>
      </div>

      {showCreateForm && (
        <div className="p-4 border-b border-border bg-secondary/30 space-y-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="გვერდის სახელი"
          />
          <Textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="აღწერა (არასავალდებულო)"
            rows={2}
          />
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger>
              <SelectValue placeholder="კატეგორია" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleCreatePage} disabled={!newName.trim()}>შექმნა</Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>გაუქმება</Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>გვერდები არ მოიძებნა</p>
          </div>
        ) : (
          pages.map(page => (
            <Card key={page.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={page.avatar_url || undefined} />
                      <AvatarFallback>{page.name[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{page.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{page.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {categories.find(c => c.value === page.category)?.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{page.followers_count} Followers</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={page.is_following ? 'outline' : 'default'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowPage(page);
                    }}
                  >
                    {page.is_following ? (
                      <><HeartOff className="h-4 w-4 mr-1" /> Following</>
                    ) : (
                      <><Heart className="h-4 w-4 mr-1" /> Follow</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PagesView;
