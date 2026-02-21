import { useState, useEffect } from 'react';
import { ArrowLeft, Search, UserPlus, MessageSquare, Loader2, Check, X, Users, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { firePush } from '@/utils/firePush';
import GenderAvatar from '@/components/shared/GenderAvatar';
import { useOnlineGracePeriod, isUserOnlineByLastSeen } from '@/hooks/useOnlineStatus';

interface Friend {
  user_id: string;
  username: string;
  avatar_url: string | null;
  age: number;
  gender: string;
  last_seen: string | null;
  online_visible_until: string | null;
  is_invisible?: boolean;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  username: string;
  avatar_url: string | null;
  age: number;
  created_at: string;
}

interface FriendSuggestion {
  user_id: string;
  username: string;
  avatar_url: string | null;
  age: number;
  gender: string;
  mutual_friends?: number;
}

interface FriendsListViewProps {
  onBack?: () => void;
  onUserClick?: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

const FriendsListView = ({ onBack, onUserClick, onMessage }: FriendsListViewProps) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'suggestions' | 'online'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { gracePeriodMinutes } = useOnlineGracePeriod();

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchRequests();
      fetchSuggestions();
      
      // Subscribe to realtime friendship updates
      const channel = supabase
        .channel(`friendships-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships'
          },
          (payload) => {
            const data = payload.new as any || payload.old as any;
            // Only refresh if we're involved
            if (data?.requester_id === user.id || data?.addressee_id === user.id) {
              fetchFriends();
              fetchRequests();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships?.length) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Parallel fetch: profiles and invisible users
      const [profilesResult, invisibleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, avatar_url, age, gender, last_seen, online_visible_until')
          .in('user_id', friendIds),
        supabase
          .from('privacy_settings')
          .select('user_id')
          .in('user_id', friendIds)
          .eq('is_invisible', true)
      ]);

      const invisibleSet = new Set(invisibleResult.data?.map(u => u.user_id) || []);

      // Map profiles with invisible flag
      const friendsWithInvisible = (profilesResult.data || []).map(profile => ({
        ...profile,
        is_invisible: invisibleSet.has(profile.user_id),
        // Hide last_seen and online_visible_until for invisible users
        last_seen: invisibleSet.has(profile.user_id) ? null : profile.last_seen,
        online_visible_until: invisibleSet.has(profile.user_id) ? null : profile.online_visible_until
      }));

      setFriends(friendsWithInvisible);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data: requestsData } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (!requestsData?.length) {
        setRequests([]);
        return;
      }

      const requesterIds = requestsData.map(r => r.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, age')
        .in('user_id', requesterIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setRequests(requestsData.map(r => ({
        id: r.id,
        requester_id: r.requester_id,
        username: profilesMap.get(r.requester_id)?.username || 'Unknown',
        avatar_url: profilesMap.get(r.requester_id)?.avatar_url || null,
        age: profilesMap.get(r.requester_id)?.age || 0,
        created_at: r.created_at,
      })));
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      // Get all user IDs that are already friends or have pending requests
      const { data: existingRelations } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const excludeIds = new Set([user.id]);
      existingRelations?.forEach(r => {
        excludeIds.add(r.requester_id);
        excludeIds.add(r.addressee_id);
      });

      // Get random users as suggestions
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, age, gender')
        .limit(50);

      if (allProfiles) {
        const filteredSuggestions = allProfiles
          .filter(p => !excludeIds.has(p.user_id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 10);

        setSuggestions(filteredSuggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    
    setSendingRequest(targetUserId);
    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast({ title: 'მოთხოვნა უკვე გაგზავნილია' });
        return;
      }

      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: targetUserId,
        status: 'pending',
      });

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: 'friend_request',
      });

      // Push notification
      firePush({ targetUserId, type: 'friend_request', fromUserId: user.id });

      toast({ title: 'მოთხოვნა გაიგზავნა!' });
      
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.user_id !== targetUserId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleAcceptRequest = async (requestId: string, requesterId: string) => {
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      // Send notification
      if (user) {
        await supabase.from('notifications').insert({
          user_id: requesterId,
          from_user_id: user.id,
          type: 'friend_accept',
        });
        firePush({ targetUserId: requesterId, type: 'friend_accepted', fromUserId: user.id });
      }

      toast({ title: 'მეგობრად დაემატა!' });
      fetchFriends();
      fetchRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      toast({ title: 'მოთხოვნა უარყოფილია' });
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const isOnline = (friend: Friend) => {
    // If invisible, always show as offline
    if (friend.is_invisible) return false;
    
    // Primary check: online_visible_until (more accurate)
    if (friend.online_visible_until) {
      return new Date(friend.online_visible_until) > new Date();
    }
    
    // Fallback: last_seen within admin-configured grace period
    return isUserOnlineByLastSeen(friend.last_seen, gracePeriodMinutes);
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return '👨';
      case 'female': return '👩';
      default: return '🧑';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ახლახანს';
    if (mins < 60) return `${mins} წთ წინ`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} სთ წინ`;
    const days = Math.floor(hours / 24);
    return `${days} დღის წინ`;
  };

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div 
        className="flex-shrink-0 bg-card border-b border-border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="p-1">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold flex-1">მეგობრები</h1>
          {requests.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {requests.length}
            </span>
          )}
        </div>

        {/* Tabs - Compact layout */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-shrink-0 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'friends' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            მეგობრები ({friends.length})
            {activeTab === 'friends' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('online')}
            className={`flex-shrink-0 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'online' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            საიტზეა ({friends.filter(f => isOnline(f)).length})
            {activeTab === 'online' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-shrink-0 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'suggestions' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            შემოთავაზება
            {activeTab === 'suggestions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-shrink-0 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'requests' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            მოთხოვნები
            {requests.length > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
            {activeTab === 'requests' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Search - only for friends, online and suggestions tabs */}
        {(activeTab === 'friends' || activeTab === 'suggestions' || activeTab === 'online') && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'friends' ? 'მეგობრის ძებნა...' : 'მომხმარებლის ძებნა...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'friends' || activeTab === 'online' ? (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (() => {
            // Filter friends based on tab and search
            const displayFriends = activeTab === 'online' 
              ? filteredFriends.filter(f => isOnline(f))
              : filteredFriends;
            
            return displayFriends.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {activeTab === 'online' ? 'online მეგობრები არ არის' : 'მეგობრები ჯერ არ გყავთ'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {activeTab === 'online' 
                    ? 'ამ მომენტში თქვენი მეგობრები საიტზე არ არიან'
                    : 'მოძებნეთ მომხმარებლები და გაუგზავნეთ მეგობრობის მოთხოვნა'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displayFriends.map((friend) => {
                  const handleClick = () => {
                    console.log('[FriendsListView] Navigating to user:', friend.user_id);
                    if (onUserClick) {
                      onUserClick(friend.user_id);
                    }
                  };
                  
                  return (
                    <div
                      key={friend.user_id}
                      role="button"
                      tabIndex={0}
                      className="flex items-center gap-3 p-4 hover:bg-secondary/50 active:bg-secondary transition-colors cursor-pointer select-none"
                      onClick={handleClick}
                      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                    >
                      <div className="relative pointer-events-none">
                        <GenderAvatar
                          src={friend.avatar_url}
                          gender={friend.gender}
                          username={friend.username}
                          className="w-14 h-14"
                        />
                        {isOnline(friend) && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-[hsl(142,70%,45%)] rounded-full border-2 border-background" />
                        )}
                      </div>

                      <div className="flex-1 text-left pointer-events-none">
                        <h3 className="font-semibold text-foreground">{friend.username}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getGenderLabel(friend.gender)} {friend.age} წლის
                          {isOnline(friend) ? (
                            <span className="text-[hsl(142,70%,45%)] ml-2">• online</span>
                          ) : null}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onMessage?.(friend.user_id);
                        }}
                        className="p-3 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors z-10"
                      >
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : activeTab === 'suggestions' ? (
          // Suggestions tab
          <>
            {suggestions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">შემოთავაზებები არ არის</h3>
                <p className="text-muted-foreground text-sm">
                  მოგვიანებით შეამოწმეთ ახალი მომხმარებლები
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {suggestions
                  .filter(s => s.username.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((suggestion) => {
                    const handleClick = () => {
                      console.log('[FriendsListView] Navigating to suggestion:', suggestion.user_id);
                      if (onUserClick) {
                        onUserClick(suggestion.user_id);
                      }
                    };
                    
                    return (
                      <div
                        key={suggestion.user_id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-3 p-4 hover:bg-secondary/50 active:bg-secondary transition-colors cursor-pointer select-none"
                        onClick={handleClick}
                        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                      >
                        <div className="relative pointer-events-none">
                          <GenderAvatar
                            src={suggestion.avatar_url}
                            gender={suggestion.gender}
                            username={suggestion.username}
                            className="w-14 h-14"
                          />
                        </div>

                        <div className="flex-1 text-left pointer-events-none">
                          <h3 className="font-semibold text-foreground">{suggestion.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {getGenderLabel(suggestion.gender)} {suggestion.age} წლის
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleSendFriendRequest(suggestion.user_id);
                          }}
                          disabled={sendingRequest === suggestion.user_id}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 z-10"
                        >
                          {sendingRequest === suggestion.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span className="text-sm">დამატება</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          // Requests tab
          requests.length === 0 ? (
            <div className="text-center py-12 px-4">
              <UserPlus className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">ახალი მოთხოვნები არ არის</h3>
              <p className="text-muted-foreground text-sm">
                როცა ვინმე გამოგიგზავნით მეგობრობის მოთხოვნას, აქ გამოჩნდება
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map((request) => {
                const handleClick = () => {
                  console.log('[FriendsListView] Navigating to requester:', request.requester_id);
                  if (onUserClick) {
                    onUserClick(request.requester_id);
                  }
                };
                
                return (
                  <div
                    key={request.id}
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-3 p-4 hover:bg-secondary/50 active:bg-secondary transition-colors cursor-pointer select-none"
                    onClick={handleClick}
                    onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden pointer-events-none">
                      {request.avatar_url ? (
                        <img
                          src={request.avatar_url}
                          alt={request.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {request.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 pointer-events-none">
                      <h3 className="font-semibold text-foreground">{request.username}</h3>
                      <p className="text-sm text-muted-foreground">
                        {request.age} წლის • {getTimeAgo(request.created_at)}
                      </p>
                    </div>

                    <div className="flex gap-2 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleAcceptRequest(request.id, request.requester_id);
                        }}
                        className="p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRejectRequest(request.id);
                        }}
                        className="p-2 bg-secondary rounded-full text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
};

export default FriendsListView;
