import { useState, useEffect } from 'react';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfileSubscribersProps {
  userId: string;
  onUserClick?: (userId: string) => void;
}

interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  isFollowing?: boolean;
}

const ProfileSubscribers = ({ userId, onUserClick }: ProfileSubscribersProps) => {
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch followers
        const { data: followersData } = await supabase
          .from('followers')
          .select('follower_id')
          .eq('following_id', userId);

        if (followersData && followersData.length > 0) {
          const followerIds = followersData.map(f => f.follower_id);
          const { data: followerProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', followerIds);

          // Check which ones current user is following
          let followingSet = new Set<string>();
          if (user) {
            const { data: myFollowing } = await supabase
              .from('followers')
              .select('following_id')
              .eq('follower_id', user.id)
              .in('following_id', followerIds);

            followingSet = new Set(myFollowing?.map(f => f.following_id) || []);
          }

          setFollowers(
            (followerProfiles || []).map(p => ({
              ...p,
              isFollowing: followingSet.has(p.user_id)
            }))
          );
        } else {
          setFollowers([]);
        }

        // Fetch following
        const { data: followingData } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', userId);

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map(f => f.following_id);
          const { data: followingProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', followingIds);

          // Check which ones current user is following
          let followingSet = new Set<string>();
          if (user) {
            const { data: myFollowing } = await supabase
              .from('followers')
              .select('following_id')
              .eq('follower_id', user.id)
              .in('following_id', followingIds);

            followingSet = new Set(myFollowing?.map(f => f.following_id) || []);
          }

          setFollowing(
            (followingProfiles || []).map(p => ({
              ...p,
              isFollowing: followingSet.has(p.user_id)
            }))
          );
        } else {
          setFollowing([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, user]);

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;

    try {
      await supabase.from('followers').insert({
        follower_id: user.id,
        following_id: targetUserId
      });

      setFollowers(prev => 
        prev.map(p => p.user_id === targetUserId ? { ...p, isFollowing: true } : p)
      );
      setFollowing(prev => 
        prev.map(p => p.user_id === targetUserId ? { ...p, isFollowing: true } : p)
      );
      toast({ title: 'გამოწერილია!' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      setFollowers(prev => 
        prev.map(p => p.user_id === targetUserId ? { ...p, isFollowing: false } : p)
      );
      setFollowing(prev => 
        prev.map(p => p.user_id === targetUserId ? { ...p, isFollowing: false } : p)
      );
      toast({ title: 'გამოწერა გაუქმდა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const UserCard = ({ profile }: { profile: UserProfile }) => {
    const isOwnProfile = user?.id === profile.user_id;
    
    return (
      <div 
        className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-xl transition-colors cursor-pointer"
        onClick={() => onUserClick?.(profile.user_id)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
              {profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{profile.username}</span>
        </div>
        {user && !isOwnProfile && (
          <div onClick={(e) => e.stopPropagation()}>
            {profile.isFollowing ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleUnfollow(profile.user_id)}
              >
                <UserMinus className="w-4 h-4 mr-1" />
                გამოწერილი
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => handleFollow(profile.user_id)}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                გამოწერა
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <Tabs defaultValue="followers">
        <TabsList className="w-full">
          <TabsTrigger value="followers" className="flex-1">
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="following" className="flex-1">
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followers" className="mt-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : followers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No followers yet
            </p>
          ) : (
            followers.map(profile => (
              <UserCard key={profile.user_id} profile={profile} />
            ))
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : following.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Not following anyone yet
            </p>
          ) : (
            following.map(profile => (
              <UserCard key={profile.user_id} profile={profile} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileSubscribers;
