import { useState, useEffect, memo, useCallback } from 'react';
import { Search, Home, Video, Film, Users, Gamepad2, MessageCircle, Music, BookOpen, Eye, Settings, Image as ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import AISearchDropdown from '@/components/search/AISearchDropdown';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import ProfileVisitors from '@/components/profile/ProfileVisitors';
import ModernThemeSwitcher from '../ModernThemeSwitcher';
import RealTimeClock from '../RealTimeClock';
import StyledUsername from '@/components/username/StyledUsername';
import ChatSevLogo from '@/components/ui/ChatSevLogo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FacebookTopbarProps {
  onSearchClick: () => void;
  onUserClick: (userId: string) => void;
  onGroupChatNavigate?: (messageId: string, username?: string) => void;
  onRightDrawerToggle: () => void;
  onMessagesClick: () => void;
  onCreateStory?: () => void;
  onPostClick?: (postId: string) => void;
  onStoryClick?: (userId: string) => void;
  onPollClick?: (pollId: string) => void;
  onQuizClick?: (quizId: string) => void;
  onVideoClick?: (videoId: string) => void;
  onReelClick?: (reelId: string) => void;
  onDatingClick?: (tab: 'discover' | 'matches' | 'likes') => void;
  onGameInviteAccepted?: (roomId: string, gameType: string) => void;
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

const FacebookTopbar = memo(({
  onSearchClick,
  onUserClick,
  onGroupChatNavigate,
  onRightDrawerToggle,
  onMessagesClick,
  onCreateStory,
  onPostClick,
  onStoryClick,
  onPollClick,
  onQuizClick,
  onVideoClick,
  onReelClick,
  onDatingClick,
  onGameInviteAccepted,
  onTabChange,
  activeTab = 'home'
}: FacebookTopbarProps) => {
  const { user, profile } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messengerUnread, setMessengerUnread] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState(0);

  // Fetch unread messages count
  const fetchUnreadMessages = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: conversationStates } = await supabase
        .from('conversation_user_state')
        .select('conversation_id, is_deleted, is_cleared, cleared_at')
        .eq('user_id', user.id);

      const deletedConvIds = new Set(
        conversationStates?.filter(s => s.is_deleted).map(s => s.conversation_id) || []
      );
      const clearedConvMap = new Map(
        conversationStates?.filter(s => s.is_cleared && s.cleared_at).map(s => [s.conversation_id, s.cleared_at]) || []
      );

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const activeConvIds = conversations?.map(c => c.id).filter(id => !deletedConvIds.has(id)) || [];

      if (activeConvIds.length === 0) {
        setUnreadMessages(0);
        return;
      }

      const { data: messages } = await supabase
        .from('private_messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', activeConvIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);
      
      const filteredCount = messages?.filter(msg => {
        const clearedAt = clearedConvMap.get(msg.conversation_id);
        if (!clearedAt) return true;
        return new Date(msg.created_at) > new Date(clearedAt);
      }).length || 0;

      setUnreadMessages(filteredCount);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  }, [user?.id]);

  // Fetch messenger unread count
  const fetchMessengerUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: convs } = await supabase
        .from('messenger_conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!convs || convs.length === 0) {
        setMessengerUnread(0);
        return;
      }

      const { data: unreadMsgs } = await supabase
        .from('messenger_messages')
        .select('id')
        .in('conversation_id', convs.map(c => c.id))
        .neq('sender_id', user.id)
        .is('read_at', null);

      setMessengerUnread(unreadMsgs?.length || 0);
    } catch (error) {
      console.error('Error fetching messenger unread:', error);
    }
  }, [user?.id]);

  // Fetch visitors count
  const fetchVisitorsCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: superAdmins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin');
      
      const superAdminIds = new Set(superAdmins?.map(sa => sa.user_id) || []);
      
      const { data: visits } = await supabase
        .from('profile_visits')
        .select('id, visitor_user_id')
        .eq('profile_user_id', user.id)
        .eq('is_seen', false);
      
      const filteredCount = (visits || []).filter(v => !superAdminIds.has(v.visitor_user_id)).length;
      setVisitorsCount(filteredCount);
    } catch (error) {
      console.error('Error fetching visitors count:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUnreadMessages();
    fetchVisitorsCount();
    fetchMessengerUnread();
    
    let debounceTimer: NodeJS.Timeout | null = null;
    let lastFetchTime = Date.now();
    const MIN_FETCH_INTERVAL = 10000;
    
    const channel = supabase
      .channel('fb-topbar-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, () => {
        const now = Date.now();
        if (now - lastFetchTime < MIN_FETCH_INTERVAL) return;
        
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          lastFetchTime = Date.now();
          fetchUnreadMessages();
        }, 2000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messenger_messages' }, () => {
        fetchMessengerUnread();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profile_visits',
        filter: user?.id ? `profile_user_id=eq.${user.id}` : undefined
      }, () => {
        fetchVisitorsCount();
      })
      .subscribe();

    return () => { 
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel); 
    };
  }, [fetchUnreadMessages, fetchVisitorsCount, fetchMessengerUnread, user?.id]);

  const handleLogoClick = useCallback(() => {
    if (activeTab === 'home' || activeTab === 'feed') {
      window.location.reload();
    } else {
      onTabChange?.('home');
    }
  }, [activeTab, onTabChange]);

  const handleOpenVisitors = useCallback(async () => {
    setShowVisitorsModal(true);
    if (user?.id) {
      await supabase
        .from('profile_visits')
        .update({ is_seen: true })
        .eq('profile_user_id', user.id)
        .eq('is_seen', false);
      setVisitorsCount(0);
    }
  }, [user?.id]);

  // Quick navigation items for center nav
  const navItems = [
    { id: 'home', label: 'მთავარი', icon: Home },
    { id: 'videos', label: 'ვიდეოები', icon: Video },
    { id: 'games', label: 'თამაშები', icon: Gamepad2 },
    { id: 'photos', label: 'ფოტოგალერია', icon: ImageIcon },
    { id: 'music', label: 'მუსიკა', icon: Music },
    { id: 'blogs', label: 'ბლოგი', icon: BookOpen },
    { id: 'group-chat', label: 'ჩატი', icon: Users },
  ];

  const IconButton = ({ 
    icon: Icon, 
    badge, 
    tooltip,
    onClick,
    pulse = false
  }: { 
    icon: any; 
    badge?: number; 
    tooltip: string;
    onClick?: () => void;
    pulse?: boolean;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative p-2.5 rounded-xl transition-all duration-300 group",
            "hover:bg-secondary/60 hover:scale-105 active:scale-95",
            "border border-transparent hover:border-border/30"
          )}
        >
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.75} />
          {badge !== undefined && badge > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px]",
              "bg-gradient-to-r from-primary to-accent text-primary-foreground",
              "text-[10px] font-bold rounded-full flex items-center justify-center px-1.5",
              "shadow-lg shadow-primary/30",
              pulse && "animate-pulse"
            )}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs font-medium">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <header className="sticky top-0 z-30 h-[64px] bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-2xl border-b border-border/20 flex items-center justify-between px-6 gap-4 desktop-topbar-fixed">
        {/* Left: Logo */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="relative group-hover:scale-105 transition-transform duration-300">
            <ChatSevLogo size={40} />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-online rounded-full border-2 border-card online-ping" />
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="font-bold text-2xl leading-tight tracking-tight">
              <span className="text-foreground">Chat</span>
              <span className="text-primary">Sev</span>
            </span>
            <span className="text-[9px] text-muted-foreground font-medium">სოციალური ქსელი</span>
          </div>
        </button>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className={cn(
            "relative group transition-all duration-300",
            isSearchFocused && "scale-[1.02]"
          )}>
            <Search className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300",
              isSearchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <input
              type="text"
              placeholder="მოძებნე..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(e.target.value.length > 0);
              }}
              onFocus={() => {
                setShowSearchDropdown(true);
                setIsSearchFocused(true);
              }}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "w-full pl-11 pr-4 h-11 rounded-xl transition-all duration-300",
                "bg-secondary/30 border border-border/20",
                "hover:bg-secondary/50 hover:border-border/40",
                "focus:ring-2 focus:ring-primary/30 focus:border-primary/40",
                "focus:bg-secondary/60 focus:shadow-lg focus:shadow-primary/10",
                "placeholder:text-muted-foreground/60 outline-none text-foreground"
              )}
            />
          </div>
          <AISearchDropdown
            isOpen={showSearchDropdown}
            onClose={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
            onUserClick={(userId) => { onUserClick(userId); setShowSearchDropdown(false); setSearchQuery(''); }}
            onPostClick={onPostClick}
            onPollClick={onPollClick}
          />
        </div>

        {/* Center: Navigation Icons */}
        <nav className="hidden lg:flex items-center gap-0.5 p-1 bg-secondary/15 rounded-xl border border-border/20">
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange?.(item.id)}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300 group relative",
                    activeTab === item.id 
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-secondary/60 hover:scale-105 active:scale-95"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 transition-colors",
                    activeTab === item.id 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-primary"
                  )} strokeWidth={1.75} />
                  {activeTab === item.id && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Right: Actions - Inline layout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Switcher */}
          <ModernThemeSwitcher />

          {/* Real Time Clock - Compact inline */}
          <div className="hidden xl:block">
            <RealTimeClock />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-0.5 p-1 bg-secondary/15 rounded-xl border border-border/20">
            <IconButton
              onClick={onMessagesClick}
              icon={MessageCircle}
              badge={unreadMessages + messengerUnread}
              tooltip="შეტყობინებები"
            />
            
            <NotificationDropdown 
              onUserClick={onUserClick} 
              onGroupChatNavigate={onGroupChatNavigate}
              onCreateStory={onCreateStory}
              onPostClick={onPostClick}
              onStoryClick={onStoryClick}
              onPollClick={onPollClick}
              onQuizClick={onQuizClick}
              onVideoClick={onVideoClick}
              onReelClick={onReelClick}
              onDatingClick={onDatingClick}
              onGameInviteAccepted={onGameInviteAccepted}
            />

            <IconButton
              onClick={handleOpenVisitors}
              icon={Eye}
              badge={visitorsCount}
              tooltip="ვიზიტორები"
              pulse={visitorsCount > 0}
            />
          </div>

          {/* User Profile Button */}
          {profile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={onRightDrawerToggle}
                  className={cn(
                    "flex items-center gap-3 p-1.5 pr-4 rounded-xl transition-all duration-300 group",
                    "hover:bg-secondary/40 border border-transparent hover:border-border/30",
                    "hover:shadow-lg hover:shadow-primary/5"
                  )}
                >
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold">
                      {profile.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex flex-col items-start">
                    <span className="text-sm font-semibold leading-tight">
                      <StyledUsername userId={user?.id || ''} username={profile.username} />
                    </span>
                    <span className="text-[10px] text-online font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-online rounded-full" />
                      Online
                    </span>
                  </div>
                  <Settings className="w-4 h-4 text-muted-foreground hidden xl:block group-hover:text-primary group-hover:rotate-45 transition-all duration-300" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">მენიუ</TooltipContent>
            </Tooltip>
          )}
        </div>
      </header>

      <ProfileVisitors 
        isOpen={showVisitorsModal} 
        onClose={() => setShowVisitorsModal(false)}
        onNavigateToProfile={onUserClick}
      />
    </TooltipProvider>
  );
});

FacebookTopbar.displayName = 'FacebookTopbar';

export default FacebookTopbar;
