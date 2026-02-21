import { useState, useCallback, memo, useEffect, useRef } from 'react';
import { Menu, Search, Eye, MessageCircle, Bell, Home, Users, User, Loader2 } from 'lucide-react';
import GroupIcon from '@/components/icons/GroupIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ChatSevLogo from '@/components/ui/ChatSevLogo';
import NotificationsFullPage from '@/components/notifications/NotificationsFullPage';
import ProfileVisitorsFullPage from '@/components/profile/ProfileVisitorsFullPage';
import MobileSearchPage from '@/components/search/MobileSearchPage';

interface MobileHeaderProps {
  onMenuClick: () => void;
  onUserClick?: (userId: string) => void;
  onSearchClick?: () => void;
  onGroupChatNavigate?: (messageId: string, username?: string) => void;
  onCreateStory?: () => void;
  onLogoClick?: () => void;
  onPostClick?: (postId: string) => void;
  onStoryClick?: (userId: string) => void;
  onPollClick?: (pollId: string) => void;
  onQuizClick?: (quizId: string) => void;
  onVideoClick?: (videoId: string) => void;
  onReelClick?: (reelId: string) => void;
  onDatingClick?: (tab?: 'discover' | 'matches' | 'likes') => void;
  onCreatePost?: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMessagesClick?: () => void;
  unreadMessagesCount?: number;
  notificationCount?: number;
  onNotificationCountChange?: () => void;
  onGameInviteAccepted?: (roomId: string, gameType: string) => void;
}

type NotificationType = 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'message' | 'follow' | 'group_chat_reply' | 'group_chat_reaction' | 'group_chat_mention' | 'private_group_message' | 'content_approved' | 'content_rejected' | 'ignore' | 'reaction' | 'post_reaction' | 'live_started' | 'story_expired' | 'story_comment' | 'relationship_proposal' | 'relationship_accepted' | 'relationship_rejected' | 'relationship_ended' | 'reel_like' | 'reel_comment' | 'friend_post' | 'friend_photo' | 'friend_video' | 'friend_story' | 'friend_reel' | 'friend_avatar_change' | 'friend_cover_change' | 'friend_poll' | 'friend_quiz' | 'group_invite' | 'group_join_request' | 'group_post' | 'group_member_joined' | 'group_invite_accepted' | 'group_request_approved' | 'dating_match' | 'dating_like' | 'dating_super_like' | 'dating_message';

interface CachedNotification {
  id: string;
  type: NotificationType;
  from_user_id: string;
  post_id?: string | null;
  message?: string | null;
  content?: string | null;
  related_id?: string | null;
  related_type?: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string;
    avatar_url: string | null;
  };
}

interface CachedVisitor {
  id: string;
  visitor_user_id: string;
  visited_at: string;
  visitor?: {
    username: string;
    avatar_url: string | null;
  };
}

const MobileHeader = memo(({ 
  onMenuClick, 
  onUserClick, 
  onSearchClick, 
  onGroupChatNavigate, 
  onCreateStory, 
  onLogoClick, 
  onPostClick, 
  onStoryClick, 
  onPollClick, 
  onQuizClick, 
  onVideoClick, 
  onReelClick, 
  onDatingClick,
  onCreatePost,
  activeTab,
  onTabChange,
  onMessagesClick,
  unreadMessagesCount = 0,
  notificationCount = 0,
  onNotificationCountChange,
  onGameInviteAccepted
}: MobileHeaderProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState(0);
  
  // Pre-cached data for instant display
  const [cachedNotifications, setCachedNotifications] = useState<CachedNotification[]>([]);
  const [cachedVisitors, setCachedVisitors] = useState<CachedVisitor[]>([]);
  const dataLoadedRef = useRef(false);

  const fetchUnseenVisitorsCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profile_visits')
        .select('id, visitor_user_id')
        .eq('profile_user_id', user.id)
        .eq('is_seen', false);

      if (error) throw error;

      // Filter out super admins
      if (data && data.length > 0) {
        const visitorIds = data.map(v => v.visitor_user_id);
        const { data: superAdmins } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('user_id', visitorIds)
          .eq('role', 'super_admin');
        
        const superAdminIds = new Set(superAdmins?.map(s => s.user_id) || []);
        const filteredCount = data.filter(v => !superAdminIds.has(v.visitor_user_id)).length;
        setVisitorsCount(filteredCount);
      } else {
        setVisitorsCount(0);
      }
    } catch (error) {
      console.error('Error fetching visitors count:', error);
    }
  }, [user?.id]);

  const markVisitorsAsSeen = async () => {
    if (!user?.id) return;
    await supabase
      .from('profile_visits')
      .update({ is_seen: true })
      .eq('profile_user_id', user.id)
      .eq('is_seen', false);
    setVisitorsCount(0);
  };

  const handleOpenVisitors = () => {
    setShowVisitorsModal(true);
    markVisitorsAsSeen();
  };

  // Pre-load notifications data
  const preloadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data) return;

      const fromUserIds = [...new Set(data.map(n => n.from_user_id))];
      let profileMap = new Map<string, any>();
      
      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', fromUserIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      const notificationsWithUsers: CachedNotification[] = data.map(n => ({
        ...n,
        type: n.type as NotificationType,
        from_user: profileMap.get(n.from_user_id)
      }));

      setCachedNotifications(notificationsWithUsers);
    } catch (error) {
      console.error('Error preloading notifications:', error);
    }
  }, [user?.id]);

  // Pre-load visitors data
  const preloadVisitors = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [visitorsResult, superAdminsResult] = await Promise.all([
        supabase
          .from('profile_visits')
          .select('id, visitor_user_id, visited_at')
          .eq('profile_user_id', user.id)
          .order('visited_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'super_admin')
      ]);

      if (visitorsResult.error) return;
      
      const superAdminIds = new Set(superAdminsResult.data?.map(sa => sa.user_id) || []);
      const data = visitorsResult.data;

      if (data && data.length > 0) {
        const filteredData = data.filter(v => !superAdminIds.has(v.visitor_user_id));
        
        if (filteredData.length > 0) {
          const visitorIds = filteredData.map(v => v.visitor_user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', visitorIds);

          const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

          const visibleVisitors = filteredData
            .map(v => ({
              ...v,
              visitor: profilesMap.get(v.visitor_user_id) || undefined
            }))
            .filter(v => v.visitor?.username !== 'CHEGE');

          setCachedVisitors(visibleVisitors);
        }
      }
    } catch (error) {
      console.error('Error preloading visitors:', error);
    }
  }, [user?.id]);

  // Initial data preload on mount
  useEffect(() => {
    if (user?.id && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      preloadNotifications();
      preloadVisitors();
    }
  }, [user?.id, preloadNotifications, preloadVisitors]);

  useEffect(() => {
    if (user?.id) {
      fetchUnseenVisitorsCount();
      
      const channel = supabase
        .channel('mobile-visitors')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profile_visits',
            filter: `profile_user_id=eq.${user.id}`
          },
          () => {
            fetchUnseenVisitorsCount();
            preloadVisitors();
          }
        )
        .subscribe();

      const notifChannel = supabase
        .channel('mobile-notifications-cache')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => preloadNotifications()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(notifChannel);
      };
    }
  }, [user?.id, fetchUnseenVisitorsCount, preloadVisitors, preloadNotifications]);

  const handleLogoClick = useCallback(() => {
    onLogoClick?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onLogoClick]);

  // Navigation items
  const navItems = [
    { id: 'feed', icon: Home, label: t.home },
    { id: 'groups', icon: GroupIcon, label: 'ჯგუფები' },
    { id: 'friends-list', icon: Users, label: t.friends },
    { id: 'profile', icon: User, label: t.profile },
  ];

  return (
    <>
      {/* Top Bar - Logo and Actions - Fixed at top, never hides */}
      <div 
        className="bg-background/80 dark:bg-card/90 border-b border-border/60 backdrop-blur-xl"
        style={{ 
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center justify-between px-3 h-[52px]">
          {/* Logo */}
          <button 
            onClick={handleLogoClick}
            className="touch-target flex items-center gap-2"
          >
            <ChatSevLogo size={32} showText textClassName="text-xl" />
          </button>

          {/* Right Actions - Visitors, Search, Messages */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenVisitors}
              className="relative p-2 hover:bg-secondary/50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Eye className="w-6 h-6 text-foreground" strokeWidth={1.75} />
              {visitorsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                  {visitorsCount > 99 ? '99+' : visitorsCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowSearchPage(true)}
              className="p-2 hover:bg-secondary/50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Search className="w-6 h-6 text-foreground" strokeWidth={1.75} />
            </button>

            {onMessagesClick && (
              <button
                onClick={onMessagesClick}
                className="relative p-2 hover:bg-secondary/50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <MessageCircle className="w-6 h-6 text-foreground" strokeWidth={1.75} />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Static below top bar */}
      <div className="bg-background/80 dark:bg-card/90 backdrop-blur-xl border-b border-border/40" style={{ boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center h-[44px]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex-1 flex items-center justify-center py-3 relative min-h-[44px]
                transition-colors duration-200
                ${activeTab === item.id 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <item.icon className="w-6 h-6" strokeWidth={1.75} />
              {activeTab === item.id && (
                <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-primary rounded-full" />
              )}
            </button>
          ))}
          
          {/* Notifications button */}
          <button
            onClick={() => setShowNotifications(true)}
            className={`flex-1 flex items-center justify-center py-3 relative min-h-[44px] ${
              notificationCount > 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="w-6 h-6" strokeWidth={1.75} />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1/4 min-w-[16px] h-[16px] bg-destructive text-white text-[9px] font-medium rounded-full flex items-center justify-center px-0.5">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
          
          {/* Menu button */}
          <button
            onClick={onMenuClick}
            className="flex-1 flex items-center justify-center py-3 text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <Menu className="w-6 h-6" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Full page notifications */}
      {showNotifications && (
          <NotificationsFullPage
            onBack={() => setShowNotifications(false)}
            onUserClick={(userId) => { setShowNotifications(false); onUserClick?.(userId); }}
            onGroupChatNavigate={(msgId, username) => { setShowNotifications(false); onGroupChatNavigate?.(msgId, username); }}
            onCreateStory={() => { setShowNotifications(false); onCreateStory?.(); }}
            onPostClick={(postId) => { setShowNotifications(false); onPostClick?.(postId); }}
            onStoryClick={(userId) => { setShowNotifications(false); onStoryClick?.(userId); }}
            onPollClick={(pollId) => { setShowNotifications(false); onPollClick?.(pollId); }}
            onQuizClick={(quizId) => { setShowNotifications(false); onQuizClick?.(quizId); }}
            onVideoClick={(videoId) => { setShowNotifications(false); onVideoClick?.(videoId); }}
            onReelClick={(reelId) => { setShowNotifications(false); onReelClick?.(reelId); }}
            onDatingClick={(tab) => { setShowNotifications(false); onDatingClick?.(tab); }}
            onGameInviteAccepted={(roomId, gameType) => { setShowNotifications(false); onGameInviteAccepted?.(roomId, gameType); }}
            onCountChange={onNotificationCountChange}
            initialNotifications={cachedNotifications}
          />
      )}

      {/* Profile Visitors Full Page */}
      {showVisitorsModal && (
          <ProfileVisitorsFullPage 
            onBack={() => setShowVisitorsModal(false)}
            onNavigateToProfile={(userId) => { setShowVisitorsModal(false); onUserClick?.(userId); }}
            initialVisitors={cachedVisitors}
          />
      )}

      {/* AI Smart Search Full Page */}
      {showSearchPage && (
          <MobileSearchPage
            onBack={() => setShowSearchPage(false)}
            onUserClick={(userId) => { setShowSearchPage(false); onUserClick?.(userId); }}
            onPostClick={(postId) => { setShowSearchPage(false); onPostClick?.(postId); }}
            onPollClick={(pollId) => { setShowSearchPage(false); onPollClick?.(pollId); }}
          />
      )}
    </>
  );
});

MobileHeader.displayName = 'MobileHeader';

export default MobileHeader;
