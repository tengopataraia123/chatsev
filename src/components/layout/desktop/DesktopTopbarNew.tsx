import { useState, useEffect } from 'react';
import { Search, MessageCircle, Eye, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import ProfileVisitors from '@/components/profile/ProfileVisitors';
import StyledUsername from '@/components/username/StyledUsername';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import RealTimeClock from '../RealTimeClock';
import AISearchDropdown from '@/components/search/AISearchDropdown';
import ModernThemeSwitcher from '../ModernThemeSwitcher';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface DesktopTopbarNewProps {
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
  onDatingClick?: (tab?: 'discover' | 'matches' | 'likes') => void;
  onTabChange?: (tab: string) => void;
}

const DesktopTopbarNew = ({ 
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
  onTabChange
}: DesktopTopbarNewProps) => {
  const { profile, user } = useAuth();
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messengerUnread, setMessengerUnread] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUnseenVisitorsCount();
      fetchUnreadMessages();
      fetchMessengerUnread();
      
      const channel = supabase
        .channel('desktop-topbar-new-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profile_visits',
            filter: `profile_user_id=eq.${user.id}`
          },
          () => fetchUnseenVisitorsCount()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'private_messages'
          },
          () => fetchUnreadMessages()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messenger_messages'
          },
          () => fetchMessengerUnread()
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchUnseenVisitorsCount = async () => {
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
  };

  const fetchUnreadMessages = async () => {
    if (!user?.id) return;

    try {
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!convData || convData.length === 0) {
        setUnreadMessages(0);
        return;
      }

      const convIds = convData.map(c => c.id);
      
      const { data: statesData } = await supabase
        .from('conversation_user_state')
        .select('conversation_id, is_deleted, is_cleared, cleared_at')
        .eq('user_id', user.id)
        .in('conversation_id', convIds);

      const statesMap = new Map<string, { is_deleted: boolean; cleared_at: string | null }>();
      statesData?.forEach(state => {
        statesMap.set(state.conversation_id, {
          is_deleted: state.is_deleted || false,
          cleared_at: state.cleared_at || null
        });
      });

      const activeConvIds = convIds.filter(id => {
        const state = statesMap.get(id);
        return !state?.is_deleted;
      });

      if (activeConvIds.length === 0) {
        setUnreadMessages(0);
        return;
      }

      const { data: unreadData } = await supabase
        .from('private_messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', activeConvIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      const validUnreadCount = (unreadData || []).filter(msg => {
        const state = statesMap.get(msg.conversation_id);
        if (state?.cleared_at) {
          return new Date(msg.created_at) > new Date(state.cleared_at);
        }
        return true;
      }).length;

      setUnreadMessages(validUnreadCount);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const fetchMessengerUnread = async () => {
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
  };

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

  const IconButton = ({ 
    onClick, 
    icon: Icon, 
    badge, 
    tooltip,
    pulse = false
  }: { 
    onClick: () => void; 
    icon: any; 
    badge?: number;
    tooltip: string;
    pulse?: boolean;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative p-2.5 rounded-2xl transition-all duration-300 group",
            "hover:bg-secondary/60 active:scale-95",
          )}
        >
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
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
      <header className="sticky top-0 z-30 h-[56px] bg-card/95 border-b border-border/10 flex items-center justify-between px-5 gap-4">
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
            <Input
              type="text"
              placeholder="მოძებნე..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setShowSearchDropdown(true);
                setIsSearchFocused(true);
              }}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "pl-11 pr-4 h-11 rounded-2xl transition-all duration-300",
                "bg-secondary/40 border-transparent",
                "hover:bg-secondary/60",
                "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/30",
                "focus-visible:bg-secondary/70",
                "placeholder:text-muted-foreground/60"
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

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <ModernThemeSwitcher />

          {/* Real Time Clock */}
          <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-2xl">
            <RealTimeClock />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 p-1.5 bg-secondary/25 rounded-2xl">
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
                    "flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all duration-300 group",
                    "hover:bg-secondary/50",
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
};

export default DesktopTopbarNew;
