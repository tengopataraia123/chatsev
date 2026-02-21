import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { User, MessageCircle, Users, Home } from 'lucide-react';
import GroupIcon from '@/components/icons/GroupIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MESSAGES_REFRESH_EVENT } from '@/utils/notificationEvents';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = memo(({ activeTab, onTabChange }: BottomNavProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [messengerUnreadCount, setMessengerUnreadCount] = useState(0);
  const [systemUnreadCount, setSystemUnreadCount] = useState(0);
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);
  const conversationDataRef = useRef<{ convIds: string[], deletedIds: Set<string>, clearedAtMap: Map<string, string> }>({
    convIds: [],
    deletedIds: new Set(),
    clearedAtMap: new Map()
  });

  const fetchUnreadCount = useCallback(async (force = false) => {
    if (!user) return;
    
    // Debounce - don't fetch more than once per second unless forced
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 1000) return;
    lastFetchTime.current = now;

    try {
      // Get all conversations for the user
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!convData || convData.length === 0) {
        if (isMounted.current) setUnreadCount(0);
        return;
      }

      const convIds = convData.map(c => c.id);
      
      // Get conversation states (deleted/cleared conversations)
      const { data: statesData } = await supabase
        .from('conversation_user_state')
        .select('conversation_id, is_deleted, is_cleared, cleared_at')
        .eq('user_id', user.id)
        .in('conversation_id', convIds);
      
      // Create maps for deleted/cleared states
      const deletedConvIds = new Set<string>();
      const clearedAtMap = new Map<string, string>();
      
      statesData?.forEach(state => {
        if (state.is_deleted) {
          deletedConvIds.add(state.conversation_id);
        }
        if (state.is_cleared && state.cleared_at) {
          clearedAtMap.set(state.conversation_id, state.cleared_at);
        }
      });
      
      // Store for real-time updates
      conversationDataRef.current = { convIds, deletedIds: deletedConvIds, clearedAtMap };
      
      // Filter out deleted conversations
      const activeConvIds = convIds.filter(id => !deletedConvIds.has(id));
      
      if (activeConvIds.length === 0) {
        if (isMounted.current) setUnreadCount(0);
        return;
      }
      
      // Get unread messages from active conversations
      const { data: unreadMessages } = await supabase
        .from('private_messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', activeConvIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);
      
      // Filter out messages that are before cleared_at
      let realUnreadCount = 0;
      unreadMessages?.forEach(msg => {
        const clearedAt = clearedAtMap.get(msg.conversation_id);
        if (!clearedAt || new Date(msg.created_at) > new Date(clearedAt)) {
          realUnreadCount++;
        }
      });

      if (isMounted.current) {
        setUnreadCount(realUnreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  const fetchSystemUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('system_broadcast_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('delivery_status', 'sent')
        .is('seen_at', null);
      
      if (isMounted.current) {
        setSystemUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching system unread count:', error);
    }
  }, [user]);

  // Fetch messenger unread count
  const fetchMessengerUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data: convs } = await supabase
        .from('messenger_conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!convs || convs.length === 0) {
        if (isMounted.current) setMessengerUnreadCount(0);
        return;
      }

      const { data: unreadMessages } = await supabase
        .from('messenger_messages')
        .select('id')
        .in('conversation_id', convs.map(c => c.id))
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (isMounted.current) {
        setMessengerUnreadCount(unreadMessages?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching messenger unread count:', error);
    }
  }, [user]);

  useEffect(() => {
    isMounted.current = true;
    
    if (!user) return;

    fetchUnreadCount(true);
    fetchSystemUnreadCount();
    fetchMessengerUnreadCount();

    // Subscribe to message changes with optimistic updates
    const channel = supabase
      .channel(`bottom-nav-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages'
        },
        (payload) => {
          if (!isMounted.current) return;
          const msg = payload.new as any;
          // Only count messages sent TO us, not FROM us
          if (msg.sender_id !== user.id) {
            // Check if this conversation is deleted
            if (!conversationDataRef.current.deletedIds.has(msg.conversation_id)) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages'
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          // If message was marked as read and wasn't from us
          if (newData?.is_read === true && oldData?.is_read === false && newData?.sender_id !== user.id) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      // Messenger messages subscription
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_messages'
        },
        (payload) => {
          if (!isMounted.current) return;
          const msg = payload.new as any;
          if (msg.sender_id !== user.id) {
            setMessengerUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messenger_messages'
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          // If message was marked as read
          if (newData?.read_at && !oldData?.read_at && newData?.sender_id !== user.id) {
            setMessengerUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_broadcast_recipients',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          if (!newData?.seen_at) {
            setSystemUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_broadcast_recipients',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.seen_at && !oldData?.seen_at) {
            setSystemUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();
    
    // Backup poll every 60 seconds (reduced from 30)
    const interval = setInterval(() => {
      if (isMounted.current) {
        fetchUnreadCount();
        fetchSystemUnreadCount();
        fetchMessengerUnreadCount();
      }
    }, 60000);

    // Listen for global refresh events (triggered by bulk operations)
    const handleGlobalRefresh = () => {
      if (isMounted.current) {
        fetchUnreadCount(true);
        fetchSystemUnreadCount();
        fetchMessengerUnreadCount();
      }
    };
    window.addEventListener(MESSAGES_REFRESH_EVENT, handleGlobalRefresh);

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener(MESSAGES_REFRESH_EVENT, handleGlobalRefresh);
    };
  }, [user, fetchUnreadCount, fetchSystemUnreadCount, fetchMessengerUnreadCount]);

  // Total badge includes private messages + messenger messages + system messages
  const totalBadge = unreadCount + messengerUnreadCount + systemUnreadCount;


  const navItems = [
    { id: 'feed', icon: Home, label: t.home, badge: 0 },
    { id: 'friends-list', icon: Users, label: t.friends, badge: 0 },
    { id: 'chat', icon: MessageCircle, label: t.messages, badge: totalBadge },
    { id: 'groups', icon: GroupIcon, label: 'ჯგუფები', badge: 0 },
    { id: 'profile', icon: User, label: t.profile, badge: 0 },
  ];

  const handleNavClick = (tabId: string) => {
    // If already on this tab, refresh the page
    if (activeTab === tabId) {
      window.location.reload();
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50 touch-manipulation"
      style={{ 
        paddingBottom: 'max(var(--safe-bottom, env(safe-area-inset-bottom, 0px)), 8px)',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <div className="flex items-center justify-around px-1 py-1 max-w-full">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[56px] min-h-[52px] px-2 py-1.5
                rounded-xl transition-all duration-200
                active:scale-95 active:bg-primary/10
                ${isActive ? 'text-primary' : 'text-muted-foreground'}
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <item.icon 
                  className={`w-6 h-6 transition-all duration-200 ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] bg-destructive rounded-full text-white text-[10px] flex items-center justify-center font-bold px-1 shadow-lg animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium transition-colors ${isActive ? 'text-primary' : ''}`}>
                {item.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;