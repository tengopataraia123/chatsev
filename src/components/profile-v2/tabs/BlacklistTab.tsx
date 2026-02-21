import { useState, useEffect } from 'react';
import { Eye, Loader2, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface BlockedUser {
  id: string;
  blocked_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

interface BlacklistTabProps {
  userId: string;
}

const BlacklistTab = ({ userId }: BlacklistTabProps) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlockedUsers();
  }, [userId]);

  const fetchBlockedUsers = async () => {
    try {
      const { data: blocks, error } = await supabase
        .from('user_blocks')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', userId);

      if (error) throw error;

      if (!blocks || blocks.length === 0) {
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      const blockedIds = blocks.map(b => b.blocked_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', blockedIds);

      if (profilesError) throw profilesError;

      const blockedList = blocks.map(block => {
        const profile = profiles?.find(p => p.user_id === block.blocked_id);
        return {
          id: block.id,
          blocked_id: block.blocked_id,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          created_at: block.created_at,
        };
      });

      setBlockedUsers(blockedList);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId: string, blockedId: string) => {
    setUnblockingId(blockedId);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(u => u.id !== blockId));
      toast({ title: 'იგნორი მოიხსნა' });
    } catch (error) {
      console.error('Error unblocking:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setUnblockingId(null);
    }
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
      <h3 className="font-semibold">შავი სია ({blockedUsers.length})</h3>

      {blockedUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Ban className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>შავი სია ცარიელია</p>
          <p className="text-sm mt-1">აქ გამოჩნდება დაიგნორებული მომხმარებლები</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blockedUsers.map((user) => (
            <div 
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <span className="font-medium">{user.username}</span>
              </div>

              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleUnblock(user.id, user.blocked_id)}
                disabled={unblockingId === user.blocked_id}
                title="იგნორის მოხსნა"
                className="hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30"
              >
                {unblockingId === user.blocked_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlacklistTab;
