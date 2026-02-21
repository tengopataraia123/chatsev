import { useState, useEffect } from 'react';
import { Search, MessageCircle, Eye, Bell, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import ProfileVisitors from '@/components/profile/ProfileVisitors';
import StyledUsername from '@/components/username/StyledUsername';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import RealTimeClock from './RealTimeClock';
import AISearchDropdown from '@/components/search/AISearchDropdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DesktopTopbarProps {
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
}

const DesktopTopbar = ({ 
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
  onVideoClick
}: DesktopTopbarProps) => {
  const { profile, user } = useAuth();
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUnseenVisitorsCount();
      fetchUnreadMessages();
      
      const channel = supabase
        .channel('desktop-topbar-realtime')
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
      
      const { count } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchClick();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header className="hidden lg:flex sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-xl border-b border-border items-center justify-between px-6 gap-4">
        {/* Search Bar - Centered */}
        <div className="relative flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ძიება მომხმარებლები, ჯგუფები, პოსტები..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchDropdown(true)}
              className="pl-10 h-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full"
            />
          </div>
          <AISearchDropdown
            isOpen={showSearchDropdown}
            onClose={() => setShowSearchDropdown(false)}
            onUserClick={onUserClick}
            onViewAllResults={() => {
              setShowSearchDropdown(false);
              onSearchClick();
            }}
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* Real Time Clock */}
          <div className="hidden xl:block mr-2">
            <RealTimeClock />
          </div>

          {/* Messages */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onMessagesClick}
                className="relative p-2.5 hover:bg-secondary rounded-full transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                {unreadMessages > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>შეტყობინებები</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <NotificationDropdown 
            onUserClick={onUserClick} 
            onGroupChatNavigate={onGroupChatNavigate} 
            onCreateStory={onCreateStory}
            onPostClick={onPostClick}
            onStoryClick={onStoryClick}
            onPollClick={onPollClick}
            onQuizClick={onQuizClick}
            onVideoClick={onVideoClick}
          />

          {/* Profile Visitors */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpenVisitors}
                className="relative p-2.5 hover:bg-secondary rounded-full transition-colors"
              >
                <Eye className="w-5 h-5 text-muted-foreground" />
                {visitorsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                    {visitorsCount > 99 ? '99+' : visitorsCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>ვიზიტორები</TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* User Avatar - Opens Right Drawer */}
          {profile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onRightDrawerToggle}
                  className="flex items-center gap-2 p-1.5 hover:bg-secondary rounded-full transition-colors"
                >
                  <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                    <AvatarImage src={profile.avatar_url || ''} alt={profile.username} className="object-cover" />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                      {profile.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden xl:block text-sm font-medium max-w-[100px] truncate">
                    <StyledUsername 
                      userId={user?.id || ''} 
                      username={profile.username} 
                    />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>პროფილი და პარამეტრები</TooltipContent>
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

export default DesktopTopbar;
