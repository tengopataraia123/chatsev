import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, UserMinus, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Friend {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface FriendsTabProps {
  userId: string;
  onNavigateToProfile?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  isOwnProfile?: boolean;
}

const FriendsTab = ({ userId, onNavigateToProfile, onMessage, isOwnProfile = true }: FriendsTabProps) => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; friend: Friend | null }>({
    open: false,
    friend: null,
  });
  const { toast } = useToast();
  
  // Can manage friends: own profile OR super admin
  const canManage = isOwnProfile || isSuperAdmin;

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredFriends(
        friends.filter(f => 
          f.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;

      const friendIds = friendships?.map(f => 
        f.requester_id === userId ? f.addressee_id : f.requester_id
      ) || [];

      if (friendIds.length === 0) {
        setFriends([]);
        setFilteredFriends([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url')
        .in('user_id', friendIds);

      if (profilesError) throw profilesError;

      const friendsList = profiles?.map(p => ({
        id: p.id,
        user_id: p.user_id,
        username: p.username,
        avatar_url: p.avatar_url,
      })) || [];

      setFriends(friendsList);
      setFilteredFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRemoveConfirm = (friend: Friend) => {
    setConfirmDialog({ open: true, friend });
  };

  const confirmRemoveFriend = async () => {
    const friend = confirmDialog.friend;
    if (!friend) return;
    
    setConfirmDialog({ open: false, friend: null });
    setRemovingId(friend.user_id);
    
    try {
      // Delete friendship in both directions
      await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${friend.user_id}),and(requester_id.eq.${friend.user_id},addressee_id.eq.${userId})`);

      setFriends(prev => prev.filter(f => f.user_id !== friend.user_id));
      toast({ title: 'მეგობარი წაიშალა' });
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  const handleMessageFriend = (friendUserId: string) => {
    // If onMessage prop is provided, use it
    if (onMessage) {
      onMessage(friendUserId);
      return;
    }
    
    // Otherwise, navigate using URL params which Index.tsx will handle
    if (!user) {
      toast({ title: 'გაიარეთ ავტორიზაცია', variant: 'destructive' });
      return;
    }

    // Navigate to chat using URL params - Index.tsx handles view=profile&action=message
    navigate(`/?view=profile&userId=${friendUserId}&action=message`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="მეგობრის ძებნა..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Friends count */}
      <p className="text-sm text-muted-foreground">
        {filteredFriends.length} მეგობარი
      </p>

      {/* Friends List */}
      {filteredFriends.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{searchQuery ? 'მეგობარი ვერ მოიძებნა' : 'მეგობრები არ არის'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFriends.map((friend) => (
            <div 
              key={friend.user_id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 transition-colors"
            >
              <Avatar 
                className="w-12 h-12 cursor-pointer"
                onClick={() => onNavigateToProfile?.(friend.user_id)}
              >
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback>{friend.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <button 
                onClick={() => onNavigateToProfile?.(friend.user_id)}
                className="flex-1 text-left hover:text-primary transition-colors"
              >
                <span className="font-medium">{friend.username}</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Message button - always visible */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleMessageFriend(friend.user_id)}
                  title="შეტყობინება"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                
                {/* Remove friend button - with confirmation */}
                {canManage && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openRemoveConfirm(friend)}
                    disabled={removingId === friend.user_id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="მეგობრის წაშლა"
                  >
                    {removingId === friend.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, friend: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>მეგობრის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ <span className="font-semibold">{confirmDialog.friend?.username}</span>-ის მეგობრებიდან წაშლა?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>არა</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveFriend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              დიახ, წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FriendsTab;
