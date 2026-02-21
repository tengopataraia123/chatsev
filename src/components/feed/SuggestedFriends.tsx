import { useState, useEffect, useRef, memo, forwardRef } from 'react';
import { Users, UserPlus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { firePush } from '@/utils/firePush';
import StyledUsername from '@/components/username/StyledUsername';
import { GenderAvatar } from '@/components/shared/GenderAvatar';

interface SuggestedUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  gender: string | null;
}

interface SuggestedFriendsProps {
  onUserClick?: (userId: string) => void;
}

const SuggestedFriends = memo(forwardRef<HTMLDivElement, SuggestedFriendsProps>(({ onUserClick }, ref) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      fetchSuggestions();
    }
  }, [user?.id]);

  const fetchSuggestions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all excluded user IDs in one query batch
      const [friendshipsRes, pendingRes, dismissedRes] = await Promise.all([
        supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'pending')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
          .from('dismissed_friend_suggestions')
          .select('dismissed_user_id')
          .eq('user_id', user.id)
      ]);

      const myFriendIds = new Set<string>();
      friendshipsRes.data?.forEach(f => {
        myFriendIds.add(f.requester_id === user.id ? f.addressee_id : f.requester_id);
      });

      const pendingUserIds = new Set<string>();
      pendingRes.data?.forEach(f => {
        pendingUserIds.add(f.requester_id === user.id ? f.addressee_id : f.requester_id);
      });

      const dismissedIds = new Set(dismissedRes.data?.map(d => d.dismissed_user_id) || []);
      const excludeIds = [user.id, ...myFriendIds, ...pendingUserIds, ...dismissedIds];

      // Reduced limits for faster loading
      const [femalesRes, malesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender')
          .not('user_id', 'in', `(${excludeIds.join(',')})`)
          .eq('is_approved', true)
          .not('avatar_url', 'is', null)
          .eq('gender', 'female')
          .limit(20), // Reduced from 50
        supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender')
          .not('user_id', 'in', `(${excludeIds.join(',')})`)
          .eq('is_approved', true)
          .not('avatar_url', 'is', null)
          .eq('gender', 'male')
          .limit(10) // Reduced from 30
      ]);

      const females = femalesRes.data || [];
      const males = malesRes.data || [];

      // Shuffle arrays
      const shuffleArray = <T,>(arr: T[]): T[] => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const shuffledFemales = shuffleArray(females);
      const shuffledMales = shuffleArray(males);

      // Take 70% females, 30% males (10 total for faster render)
      const targetTotal = 10;
      const femaleCount = Math.round(targetTotal * 0.7);
      const maleCount = targetTotal - femaleCount;

      const selectedFemales = shuffledFemales.slice(0, femaleCount);
      const selectedMales = shuffledMales.slice(0, maleCount);

      // Combine and shuffle final result
      const combined = shuffleArray([...selectedFemales, ...selectedMales]);

      setSuggestions(combined);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!user?.id) return;

    setSendingRequest(targetUserId);
    try {
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast({ title: 'მოთხოვნა უკვე გაგზავნილია', variant: 'destructive' });
        return;
      }

      const [friendshipResult, notificationResult] = await Promise.all([
        supabase.from('friendships').insert({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending',
        }),
        supabase.from('notifications').insert({
          user_id: targetUserId,
          type: 'friend_request',
          from_user_id: user.id,
        })
      ]);

      // Push notification
      firePush({ targetUserId, type: 'friend_request', fromUserId: user.id });

      if (friendshipResult.error) {
        console.error('Friendship insert error:', friendshipResult.error);
        throw friendshipResult.error;
      }

      toast({ title: 'მოთხოვნა გაიგზავნა' });
      setPendingRequests(prev => new Set([...prev, targetUserId]));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleCancelRequest = async (targetUserId: string) => {
    if (!user?.id) return;

    setSendingRequest(targetUserId);
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('requester_id', user.id)
        .eq('addressee_id', targetUserId)
        .eq('status', 'pending');

      toast({ title: 'მოთხოვნა გაუქმდა' });
      setPendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    } catch (error) {
      console.error('Error canceling friend request:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleDismiss = async (targetUserId: string) => {
    if (!user?.id) return;

    // Remove from UI immediately
    setSuggestions(prev => prev.filter(s => s.user_id !== targetUserId));

    try {
      await supabase
        .from('dismissed_friend_suggestions')
        .insert({
          user_id: user.id,
          dismissed_user_id: targetUserId,
        });
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-muted-foreground" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-40">
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-sm">შესაძლო ნაცნობები</span>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={scrollLeft}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background rounded-full p-1.5 shadow-lg border border-border hidden sm:flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 py-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.user_id}
              className="flex-shrink-0 w-40 snap-start bg-secondary/30 rounded-xl border border-border overflow-hidden"
            >
              {/* Header with small avatar and dismiss button */}
              <div className="flex items-center justify-between p-2">
                <button
                  onClick={() => onUserClick?.(suggestion.user_id)}
                  className="flex-shrink-0"
                >
                  <GenderAvatar
                    userId={suggestion.user_id}
                    src={suggestion.avatar_url}
                    gender={suggestion.gender}
                    username={suggestion.username}
                    className="w-8 h-8"
                    showStoryRing={false}
                  />
                </button>
                <button
                  onClick={() => handleDismiss(suggestion.user_id)}
                  className="p-1 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Main rectangular photo */}
              <button
                onClick={() => onUserClick?.(suggestion.user_id)}
                className="w-full px-3"
              >
                <div className="aspect-square w-full overflow-hidden rounded-lg border-2 border-border bg-muted">
                  {suggestion.avatar_url ? (
                    <img
                      src={suggestion.avatar_url}
                      alt={suggestion.username}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GenderAvatar
                        gender={suggestion.gender}
                        username={suggestion.username}
                        className="w-16 h-16"
                        showStoryRing={false}
                      />
                    </div>
                  )}
                </div>
              </button>

              <div className="p-3 text-center space-y-2">
                <button
                  onClick={() => onUserClick?.(suggestion.user_id)}
                  className="block w-full"
                >
                  <StyledUsername
                    username={suggestion.username}
                    userId={suggestion.user_id}
                    className="font-semibold text-sm truncate block"
                  />
                </button>

                <div className="space-y-1.5">
                  {pendingRequests.has(suggestion.user_id) ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full h-8 text-xs font-semibold px-2"
                      onClick={() => handleCancelRequest(suggestion.user_id)}
                      disabled={sendingRequest === suggestion.user_id}
                    >
                      {sendingRequest === suggestion.user_id ? '...' : 'გაუქმება'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs font-semibold px-2"
                      onClick={() => handleAddFriend(suggestion.user_id)}
                      disabled={sendingRequest === suggestion.user_id}
                    >
                      <UserPlus className="w-3 h-3 mr-1 flex-shrink-0" />
                      {sendingRequest === suggestion.user_id ? '...' : 'დამატება'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-8 text-xs px-2"
                    onClick={() => handleDismiss(suggestion.user_id)}
                  >
                    ამოშლა
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={scrollRight}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background rounded-full p-1.5 shadow-lg border border-border hidden sm:flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}));

SuggestedFriends.displayName = 'SuggestedFriends';

export default SuggestedFriends;
