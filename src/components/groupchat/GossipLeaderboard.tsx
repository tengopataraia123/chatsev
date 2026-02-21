import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, ChevronDown, ChevronUp, Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  message_count: number;
}

interface GossipLeaderboardProps {
  onNavigateToProfile?: (userId: string) => void;
  currentUserId?: string;
}


const GossipLeaderboard = memo(({ onNavigateToProfile, currentUserId }: GossipLeaderboardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const profileCacheRef = useRef<Map<string, { username: string; avatar_url: string | null }>>(new Map());

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      // Read from persistent leaderboard table (survives message deletion)
      const { data: lbData, error } = await supabase
        .from('gossip_leaderboard')
        .select('user_id, message_count')
        .gt('message_count', 0)
        .order('message_count', { ascending: false });

      if (error) throw error;

      if (!lbData || lbData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = lbData.map(r => r.user_id);
      const uncachedIds = userIds.filter(id => !profileCacheRef.current.has(id));
      
      if (uncachedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', uncachedIds);
        
        profiles?.forEach(p => {
          profileCacheRef.current.set(p.user_id, { username: p.username, avatar_url: p.avatar_url });
        });
      }

      const leaderboard: LeaderboardUser[] = lbData.map(r => ({
        user_id: r.user_id,
        username: profileCacheRef.current.get(r.user_id)?.username || 'Unknown',
        avatar_url: profileCacheRef.current.get(r.user_id)?.avatar_url || null,
        message_count: r.message_count,
      }));

      setUsers(leaderboard);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!expanded) return;
    fetchLeaderboard();
  }, [expanded, fetchLeaderboard]);

  // Real-time: re-fetch when leaderboard table updates
  useEffect(() => {
    if (!expanded) return;

    const channel = supabase
      .channel('leaderboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gossip_leaderboard' },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expanded, fetchLeaderboard]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-4 h-4 text-amber-400" />;
    if (index === 1) return <Medal className="w-3.5 h-3.5 text-gray-400" />;
    if (index === 2) return <Medal className="w-3.5 h-3.5 text-amber-700" />;
    return <span className="text-[10px] text-muted-foreground font-medium w-4 text-center">{index + 1}</span>;
  };

  const currentUserIndex = currentUserId ? users.findIndex(u => u.user_id === currentUserId) : -1;

  return (
    <div className="border-b border-border">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Trophy className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-medium flex-1">ტოპ ჩატელი</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2">
          {loading && users.length === 0 ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              ჯერ მონაცემები არ არის
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-0.5">
              {users.map((user, index) => {
                const isCurrentUser = user.user_id === currentUserId;
                return (
                  <button
                    key={user.user_id}
                    onClick={() => onNavigateToProfile?.(user.user_id)}
                    className={`w-full flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-accent/30 transition-colors ${
                      isCurrentUser ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                    }`}
                  >
                    <div className="w-5 flex justify-center">{getRankIcon(index)}</div>
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-gradient-to-br from-primary to-accent text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`text-xs font-medium flex-1 text-left truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                      {user.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{user.message_count} შტყ</span>
                  </button>
                );
              })}

              {currentUserIndex >= 0 && (
                <div className="pt-1 border-t border-border/50 mt-1">
                  <p className="text-[10px] text-muted-foreground text-center">
                    შენ ხარ #{currentUserIndex + 1} ადგილზე
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

GossipLeaderboard.displayName = 'GossipLeaderboard';

export default GossipLeaderboard;
