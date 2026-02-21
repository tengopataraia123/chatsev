import { useState, useEffect, memo, useCallback } from 'react';
import { Search, MoreHorizontal, Video, Edit3, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useOnlineGracePeriod, isUserOnlineByLastSeen } from '@/hooks/useOnlineStatus';

interface FacebookRightPanelProps {
  onUserClick: (userId: string) => void;
  onMessagesClick: () => void;
}

interface Contact {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  last_message?: string;
  last_message_time?: string;
}

const FacebookRightPanel = memo(({ onUserClick, onMessagesClick }: FacebookRightPanelProps) => {
  const { user } = useAuth();
  const { gracePeriodMinutes } = useOnlineGracePeriod();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupConversations, setShowGroupConversations] = useState(true);

  // Fetch online friends and recent conversations
  const fetchContacts = useCallback(async () => {
    if (!user?.id) return;

    try {

      // Get user's friends (accepted friendships)
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships || friendships.length === 0) {
        setContacts([]);
        return;
      }

      // Extract friend IDs
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Get friends' profiles with online status
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, last_seen')
        .in('user_id', friendIds)
        .order('last_seen', { ascending: false })
        .limit(30);

      if (profiles) {
        const contactsList: Contact[] = profiles.map(p => ({
          id: p.id,
          user_id: p.user_id,
          username: p.username,
          avatar_url: p.avatar_url,
          is_online: isUserOnlineByLastSeen(p.last_seen, gracePeriodMinutes)
        }));

        // Sort: online first, then by username
        contactsList.sort((a, b) => {
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          return a.username.localeCompare(b.username);
        });

        setContacts(contactsList);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [user?.id, gracePeriodMinutes]);

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 30000);
    return () => clearInterval(interval);
  }, [fetchContacts]);

  const filteredContacts = searchQuery
    ? contacts.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : contacts;

  const onlineCount = contacts.filter(c => c.is_online).length;

  return (
    <aside className="w-[280px] h-[calc(100vh-56px)] sticky top-14 border-l border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border">
        <h2 className="text-[17px] font-bold text-foreground">კონტაქტები</h2>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
            <Video className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
            <Search className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center bg-secondary rounded-full px-3 h-9">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <input
            type="text"
            placeholder="კონტაქტების ძიება"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-foreground placeholder:text-muted-foreground outline-none w-full text-[14px]"
          />
        </div>
      </div>

      {/* Online count badge */}
      {onlineCount > 0 && (
        <div className="px-3 py-1">
          <span className="text-[13px] text-muted-foreground">
            online: <span className="text-online font-medium">{onlineCount}</span>
          </span>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto fb-scrollbar px-2 py-1">
        {filteredContacts.length > 0 ? (
          <div className="space-y-0.5">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onUserClick(contact.user_id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors group"
              >
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={contact.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-secondary text-foreground text-sm">
                      {contact.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online rounded-full border-2 border-card" />
                  )}
                </div>
                <span className="text-[15px] text-foreground truncate flex-1 text-left group-hover:text-foreground">
                  {contact.username}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-[14px] text-muted-foreground">
              {searchQuery ? 'კონტაქტი ვერ მოიძებნა' : 'კონტაქტები არ არის'}
            </p>
          </div>
        )}
      </div>

      {/* Group Conversations Section */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowGroupConversations(!showGroupConversations)}
          className="w-full px-4 py-3 flex items-center justify-between text-foreground hover:bg-secondary"
        >
          <span className="text-[15px] font-semibold">ჯგუფური საუბრები</span>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform",
            showGroupConversations && "rotate-180"
          )} />
        </button>
        
        {showGroupConversations && (
          <div className="px-2 pb-2">
            <button
              onClick={onMessagesClick}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[15px] text-foreground">ახალი შეტყობინება</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
});

FacebookRightPanel.displayName = 'FacebookRightPanel';

export default FacebookRightPanel;
