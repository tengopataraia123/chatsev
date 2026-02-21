import { useState, useEffect, memo, useCallback } from 'react';
import { Check, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requester?: {
    username: string;
    avatar_url: string | null;
    age: number;
  };
}

interface FriendRequestsViewProps {
  onUserClick?: (userId: string) => void;
}

const FriendRequestsView = memo(({ onUserClick }: FriendRequestsViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      if (!data || data.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Fetch requester profiles
      const requesterIds = data.map(r => r.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, age')
        .in('user_id', requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const requestsWithProfiles = data.map(r => ({
        ...r,
        requester: profileMap.get(r.requester_id)
      }));

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleAccept = useCallback(async (requestId: string, requesterId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: requesterId,
        from_user_id: user.id,
        type: 'friend_accept'
      });

      toast({ title: 'მეგობრობა დადასტურდა!' });
      fetchRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  }, [user, toast, fetchRequests]);

  const handleReject = useCallback(async (requestId: string) => {
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      toast({ title: 'მოთხოვნა უარყოფილია' });
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  }, [toast, fetchRequests]);

  const getTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ახლახანს';
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    return `${diffDays} დღის წინ`;
  }, []);

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>მეგობრობის მოთხოვნები არ არის</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-2 p-2 pb-24">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
          >
            <Avatar 
              className="w-12 h-12 cursor-pointer"
              onClick={() => onUserClick?.(request.requester_id)}
            >
              <AvatarImage src={request.requester?.avatar_url || ''} />
              <AvatarFallback>
                {request.requester?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p 
                className="font-medium cursor-pointer hover:text-primary"
                onClick={() => onUserClick?.(request.requester_id)}
              >
                {request.requester?.username || 'მომხმარებელი'}
              </p>
              <p className="text-sm text-muted-foreground">
                {request.requester?.age} წლის • {getTimeAgo(request.created_at)}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAccept(request.id, request.requester_id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
});

FriendRequestsView.displayName = 'FriendRequestsView';

export default FriendRequestsView;
