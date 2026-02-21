import { useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import StyledUsername from '@/components/username/StyledUsername';

interface Friend {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface ProfileFriendsProps {
  userId: string;
  onFriendClick?: (userId: string) => void;
}

const ProfileFriends = ({ userId, onFriendClick }: ProfileFriendsProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      try {
        // Get accepted friendships where this user is requester
        const { data: sentFriendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('requester_id', userId)
          .eq('status', 'accepted');
        
        // Get accepted friendships where this user is addressee
        const { data: receivedFriendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('addressee_id', userId)
          .eq('status', 'accepted');
        
        const friendships = [...(sentFriendships || []), ...(receivedFriendships || [])];

        if (friendships.length === 0) {
          setFriends([]);
          return;
        }

        // Get friend IDs (the other person in each friendship)
        const friendIds = friendships.map(f => 
          f.requester_id === userId ? f.addressee_id : f.requester_id
        );

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, avatar_url')
          .in('user_id', friendIds);

        setFriends(profiles || []);
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [userId]);

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border">
              <Skeleton className="w-20 h-20 rounded-full mx-auto mb-3" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            მეგობრები
            <span className="text-sm text-muted-foreground">({friends.length})</span>
          </h2>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="მეგობრის ძიება..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">
              {searchQuery ? 'მეგობარი ვერ მოიძებნა' : 'ჯერ არ გყავთ მეგობრები'}
            </p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => onFriendClick?.(friend.user_id)}
                className="bg-secondary/50 hover:bg-secondary rounded-xl p-4 transition-colors text-center group"
              >
                <Avatar className="w-20 h-20 mx-auto mb-3 ring-2 ring-transparent group-hover:ring-primary transition-all">
                  <AvatarImage src={friend.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/20">
                    {friend.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <StyledUsername 
                  username={friend.username} 
                  userId={friend.user_id}
                  className="text-sm font-medium truncate block"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileFriends;
