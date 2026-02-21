import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ShoppingBag, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string;
  image_urls: string[];
  user_id: string;
  is_sold: boolean;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface MarketplaceViewProps {
  onBack: () => void;
}

const categories = [
  { value: 'electronics', label: 'ელექტრონიკა' },
  { value: 'clothing', label: 'ტანსაცმელი' },
  { value: 'vehicles', label: 'ტრანსპორტი' },
  { value: 'property', label: 'უძრავი ქონება' },
  { value: 'services', label: 'სერვისები' },
  { value: 'other', label: 'სხვა' },
];

const MarketplaceView = ({ onBack }: MarketplaceViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchListings();
  }, [filterCategory]);

  const fetchListings = async () => {
    setLoading(true);
    let query = supabase
      .from('marketplace_listings')
      .select('*')
      .eq('is_sold', false)
      .order('created_at', { ascending: false });

    if (filterCategory !== 'all') {
      query = query.eq('category', filterCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const listingsWithProfiles = data.map(listing => ({
        ...listing,
        image_urls: Array.isArray(listing.image_urls) ? listing.image_urls as string[] : [],
        profile: profiles?.find(p => p.user_id === listing.user_id)
      }));

      setListings(listingsWithProfiles);
    } else {
      setListings([]);
    }
    setLoading(false);
  };

  const handleCreateListing = async () => {
    if (!newTitle.trim() || !newPrice || !user) return;

    setUploading(true);
    try {
      let imageUrls: string[] = [];

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `marketplace/${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        imageUrls = [urlData.publicUrl];
      }

      const { error } = await supabase
        .from('marketplace_listings')
        .insert({
          title: newTitle,
          description: newDescription || null,
          price: parseFloat(newPrice),
          category: newCategory,
          image_urls: imageUrls,
          user_id: user.id
        });

      if (error) throw error;

      toast({ title: 'განცხადება დაემატა!' });
      setNewTitle('');
      setNewDescription('');
      setNewPrice('');
      setNewCategory('other');
      setImageFile(null);
      setShowCreateForm(false);
      fetchListings();
    } catch (error: any) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleMarkSold = async (listingId: string) => {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ is_sold: true })
      .eq('id', listingId);

    if (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
      return;
    }

    toast({ title: 'განცხადება გაიყიდა!' });
    setSelectedListing(null);
    fetchListings();
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">მარკეტპლეისი</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-1" />
          დამატება
        </Button>
      </div>

      <div className="p-3 border-b border-border overflow-x-auto">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterCategory('all')}
          >
            ყველა
          </Button>
          {categories.map(cat => (
            <Button 
              key={cat.value}
              size="sm" 
              variant={filterCategory === cat.value ? 'default' : 'outline'}
              onClick={() => setFilterCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {showCreateForm && (
        <div className="p-4 border-b border-border bg-secondary/30 space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="სათაური"
          />
          <Textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="აღწერა"
            rows={2}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="ფასი"
              className="flex-1"
            />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreateListing} disabled={!newTitle.trim() || !newPrice || uploading}>
              {uploading ? 'იტვირთება...' : 'დამატება'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>გაუქმება</Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>განცხადებები არ მოიძებნა</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map(listing => (
              <Card 
                key={listing.id}
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                onClick={() => setSelectedListing(listing)}
              >
                {listing.image_urls[0] ? (
                  <div className="aspect-square">
                    <img 
                      src={listing.image_urls[0]} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-secondary flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="p-3">
                  <h3 className="font-medium truncate">{listing.title}</h3>
                  <p className="text-lg font-bold text-primary">{listing.price} ₾</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {categories.find(c => c.value === listing.category)?.label}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </ScrollArea>

      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-md">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedListing.title}</DialogTitle>
              </DialogHeader>
              {selectedListing.image_urls[0] && (
                <img 
                  src={selectedListing.image_urls[0]} 
                  alt={selectedListing.title}
                  className="w-full rounded-lg"
                />
              )}
              <p className="text-2xl font-bold text-primary">{selectedListing.price} ₾</p>
              <p className="text-muted-foreground">{selectedListing.description}</p>
              <div className="flex items-center gap-3 pt-4 border-t">
                <Avatar>
                  <AvatarImage src={selectedListing.profile?.avatar_url || undefined} />
                  <AvatarFallback>{selectedListing.profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{selectedListing.profile?.username}</span>
              </div>
              {user?.id === selectedListing.user_id && (
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => handleMarkSold(selectedListing.id)}
                >
                  გაყიდულად მონიშვნა
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceView;
