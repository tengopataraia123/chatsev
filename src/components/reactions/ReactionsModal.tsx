import { useState, useEffect, forwardRef, useCallback } from 'react';
import { X, Loader2, ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getReactionEmoji, REACTION_TYPES } from './ReactionPicker';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ReactionUser {
  user_id: string;
  reaction_type: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  isFriend?: boolean;
}

interface ReactionsModalProps {
  messageId: string;
  messageType: string;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
}

const ReactionsModal = forwardRef<HTMLDivElement, ReactionsModalProps>(({ messageId, messageType, onClose, onUserClick }, ref) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<ReactionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  // Fetch friend IDs
  useEffect(() => {
    const fetchFriendsAndPending = async () => {
      if (!user?.id) return;
      
      const [friendsResult, pendingResult] = await Promise.all([
        supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
          .from('friendships')
          .select('addressee_id')
          .eq('status', 'pending')
          .eq('requester_id', user.id)
      ]);
      
      if (friendsResult.data) {
        const ids = new Set<string>();
        friendsResult.data.forEach(f => {
          if (f.requester_id === user.id) {
            ids.add(f.addressee_id);
          } else {
            ids.add(f.requester_id);
          }
        });
        setFriendIds(ids);
      }
      
      if (pendingResult.data) {
        setPendingRequests(new Set(pendingResult.data.map(p => p.addressee_id)));
      }
    };
    
    fetchFriendsAndPending();
  }, [user?.id]);

  // Send friend request
  const sendFriendRequest = useCallback(async (targetUserId: string) => {
    if (!user?.id || sendingRequest) return;
    
    setSendingRequest(targetUserId);
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'მოთხოვნა უკვე გაგზავნილია' });
          setPendingRequests(prev => new Set(prev).add(targetUserId));
        } else {
          throw error;
        }
      } else {
        setPendingRequests(prev => new Set(prev).add(targetUserId));
        toast({ title: 'მოთხოვნა გაიგზავნა ✓' });
        
        // Send notification
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        await supabase.from('notifications').insert({
          user_id: targetUserId,
          from_user_id: user.id,
          type: 'friend_request',
          message: `${profile?.username || 'მომხმარებელმა'} გამოგიგზავნა მეგობრობის მოთხოვნა`,
          is_read: false,
        });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({ title: 'შეცდომა', description: 'მოთხოვნა ვერ გაიგზავნა', variant: 'destructive' });
    } finally {
      setSendingRequest(null);
    }
  }, [user?.id, sendingRequest, toast]);

  // Determine which table to query based on messageType
  const useUniversalReactions = ['room_message', 'private_message', 'story', 'comment', 'reply'].includes(messageType);

  useEffect(() => {
    fetchReactions();
    
    // Set up realtime subscription
    const tableName = useUniversalReactions ? 'universal_reactions' : 'message_reactions';
    const filterColumn = useUniversalReactions ? 'target_id' : 'message_id';
    
    const channel = supabase
      .channel(`reactions-modal-${messageId}-${messageType}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `${filterColumn}=eq.${messageId}`
        },
        () => fetchReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, messageType, useUniversalReactions]);

  const fetchReactions = async () => {
    try {
      let data: { user_id: string; reaction_type: string }[] | null = null;
      let error: any = null;

      if (useUniversalReactions) {
        // Query universal_reactions for group chats, stories, etc.
        const result = await supabase
          .from('universal_reactions')
          .select('user_id, reaction_type')
          .eq('target_id', messageId)
          .eq('target_type', messageType);
        data = result.data;
        error = result.error;
      } else {
        // Query message_reactions for DMs
        const result = await supabase
          .from('message_reactions')
          .select('user_id, reaction_type')
          .eq('message_id', messageId)
          .eq('message_type', messageType);
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (!data || data.length === 0) {
        setReactions([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const reactionsWithProfiles = data.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id)
      }));

      setReactions(reactionsWithProfiles);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Count by reaction type
  const reactionCounts = new Map<string, number>();
  reactions.forEach(r => {
    reactionCounts.set(r.reaction_type, (reactionCounts.get(r.reaction_type) || 0) + 1);
  });

  // Sort reaction types by count
  const sortedReactionTypes = REACTION_TYPES
    .filter(r => reactionCounts.has(r.type))
    .sort((a, b) => (reactionCounts.get(b.type) || 0) - (reactionCounts.get(a.type) || 0));

  const filteredReactions = activeTab === 'all' 
    ? reactions 
    : reactions.filter(r => r.reaction_type === activeTab);

  const handleUserClick = (userId: string) => {
    onClose();
    onUserClick?.(userId);
  };

  const totalCount = reactions.length;

  return (
    <motion.div 
      className="fixed inset-0 bg-black/70 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="bg-card w-full h-full flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - FB style with back arrow */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h3 className="flex-1 font-semibold text-base leading-tight">
            ადამიანები, რომლებმაც რეაქცია გამოხატეს
          </h3>
          <button className="p-2 hover:bg-secondary rounded-full">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs - Facebook style horizontal with colored backgrounds */}
        <div className="border-b border-border overflow-x-auto scrollbar-none">
          <div className="flex p-2 gap-2">
            {/* All tab */}
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                activeTab === 'all'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <span>ყველა</span>
              <span>{totalCount}</span>
            </button>

            {/* Individual reaction tabs - FB style with emoji + count */}
            {sortedReactionTypes.map(reaction => {
              const count = reactionCounts.get(reaction.type) || 0;
              const isActive = activeTab === reaction.type;
              
              return (
                <button
                  key={reaction.type}
                  onClick={() => setActiveTab(reaction.type)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                    isActive
                      ? "bg-secondary"
                      : "hover:bg-secondary/50"
                  )}
                >
                  <span className="text-lg">{reaction.emoji}</span>
                  <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredReactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              რეაქციები არ არის
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredReactions.map((reaction, index) => (
                <motion.div
                  key={`${reaction.user_id}-${reaction.reaction_type}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors"
                >
                  {/* Avatar with reaction badge */}
                  <button 
                    onClick={() => handleUserClick(reaction.user_id)}
                    className="relative flex-shrink-0"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={reaction.profile?.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="text-lg bg-secondary">
                        {reaction.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Reaction badge - bottom right corner like FB */}
                    <span 
                      className="absolute -bottom-1 -right-1 flex items-center justify-center text-base leading-none"
                    >
                      {getReactionEmoji(reaction.reaction_type)}
                    </span>
                  </button>
                  
                  {/* Username */}
                  <div className="flex-1 min-w-0">
                    <button 
                      onClick={() => handleUserClick(reaction.user_id)}
                      className="font-semibold text-sm hover:underline text-left block"
                    >
                      {reaction.profile?.username || 'მომხმარებელი'}
                    </button>
                  </div>

                  {/* Add friend button - only show if not self and not already friend */}
                  {user?.id !== reaction.user_id && !friendIds.has(reaction.user_id) && (
                    pendingRequests.has(reaction.user_id) ? (
                      <span className="px-4 py-2 bg-secondary text-muted-foreground text-sm font-semibold rounded-lg whitespace-nowrap">
                        გაგზავნილია
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendFriendRequest(reaction.user_id);
                        }}
                        disabled={sendingRequest === reaction.user_id}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap disabled:opacity-50"
                      >
                        {sendingRequest === reaction.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'მეგობრის დამატება'
                        )}
                      </button>
                    )
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});

ReactionsModal.displayName = 'ReactionsModal';

export default ReactionsModal;
