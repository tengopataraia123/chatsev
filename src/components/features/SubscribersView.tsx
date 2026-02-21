import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SubscribersViewProps {
  onBack: () => void;
}

interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  isFollowing?: boolean;
}

const SubscribersView = ({ onBack }: SubscribersViewProps) => {
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch followers
        const { data: followersData } = await supabase
          .from('followers')
          .select('follower_id')
          .eq('following_id', user.id);

        if (followersData && followersData.length > 0) {
          const followerIds = followersData.map(f => f.follower_id);
          const { data: followerProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', followerIds);

          // Check which ones I'm following back
          const { data: myFollowing } = await supabase
            .from('followers')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', followerIds);

          const followingSet = new Set(myFollowing?.map(f => f.following_id) || []);

          setFollowers(
            (followerProfiles || []).map(p => ({
              ...p,
              isFollowing: followingSet.has(p.user_id)
            }))
          );
        }

        // Fetch following
        const { data: followingData } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map(f => f.following_id);
          const { data: followingProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', followingIds);

          setFollowing(
            (followingProfiles || []).map(p => ({
              ...p,
              isFollowing: true
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleFollow = async (userId: string) => {
    if (!user) return;

    try {
      await supabase.from('followers').insert({
        follower_id: user.id,
        following_id: userId
      });

      setFollowers(prev => 
        prev.map(p => p.user_id === userId ? { ...p, isFollowing: true } : p)
      );
      toast({ title: 'Followed!' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      setFollowers(prev => 
        prev.map(p => p.user_id === userId ? { ...p, isFollowing: false } : p)
      );
      setFollowing(prev => prev.filter(p => p.user_id !== userId));
      toast({ title: 'Unfollowed' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const UserCard = ({ profile, showFollowButton = true }: { profile: UserProfile; showFollowButton?: boolean }) => (
    <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-xl transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={profile.avatar_url || ''} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
            {profile.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{profile.username}</span>
      </div>
      {showFollowButton && (
        profile.isFollowing ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUnfollow(profile.user_id)}
          >
            <UserMinus className="w-4 h-4 mr-1" />
            Following
          </Button>
        ) : (
          <Button 
            size="sm"
            onClick={() => handleFollow(profile.user_id)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Follow
          </Button>
        )
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Followers</h1>
        </div>
      </div>

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
    </div>
  );
};

export default SubscribersView;
