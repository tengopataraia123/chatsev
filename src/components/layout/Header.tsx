import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Menu, Search, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import RealTimeClock from './RealTimeClock';
import ChatSevLogo from '@/components/ui/ChatSevLogo';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import ProfileVisitors from '@/components/profile/ProfileVisitors';

interface HeaderProps {
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
  onGameInviteAccepted?: (roomId: string, gameType: string) => void;
}

const Header = memo(({ onMenuClick, onUserClick, onSearchClick, onGroupChatNavigate, onCreateStory, onLogoClick, onPostClick, onStoryClick, onPollClick, onQuizClick, onVideoClick, onReelClick, onDatingClick, onGameInviteAccepted }: HeaderProps) => {
  const { profile, user } = useAuth();
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Short delay for visual feedback
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }, []);

  const fetchUnseenVisitorsCount = useCallback(async () => {
    if (!user?.id) return;
    
    // Debounce - don't fetch more than once per 5 seconds
    const now = Date.now();
    if (now - lastFetchTime.current < 5000) return;
    lastFetchTime.current = now;
    
    try {
      // Get super admin IDs to exclude from count
      const { data: superAdmins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin');
      
      const superAdminIds = new Set(superAdmins?.map(sa => sa.user_id) || []);
      
      // Count only unseen visits
      const { data: visits, error } = await supabase
        .from('profile_visits')
        .select('id, visitor_user_id')
        .eq('profile_user_id', user.id)
        .eq('is_seen', false);
      
      if (error || !isMounted.current) {
        return;
      }
      
      // Filter out super admins in JavaScript
      const filteredCount = (visits || []).filter(v => !superAdminIds.has(v.visitor_user_id)).length;
      setVisitorsCount(filteredCount);
    } catch (error) {
      console.error('Error in fetchUnseenVisitorsCount:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    isMounted.current = true;
    
    if (user?.id) {
      fetchUnseenVisitorsCount();
      
      // Subscribe to realtime updates for new visits AND updates
      const channel = supabase
        .channel('profile-visits-realtime')
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
          }
        )
        .subscribe();
      
      return () => {
        isMounted.current = false;
        supabase.removeChannel(channel);
      };
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [user?.id, fetchUnseenVisitorsCount]);


  const markVisitorsAsSeen = async () => {
    if (!user?.id) return;
    
    // Mark all visits as seen
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

  const handleOwnProfileClick = () => {
    if (user?.id && onUserClick) {
      onUserClick(user.id);
    }
  };

  const handleNavigateToProfile = (userId: string) => {
    onUserClick?.(userId);
  };

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border w-full max-w-full overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-1 sm:px-2 py-1.5 sm:py-2 max-w-full">
        {/* Logo - far left */}
        <div 
          className="flex-shrink-0 cursor-pointer select-none" 
          onClick={() => {
            if (onLogoClick) {
              onLogoClick();
            } else {
              window.location.href = '/';
            }
          }}
        >
          <ChatSevLogo size={28} showText textClassName="text-lg" />
        </div>

        {/* Real Time Clock - Show compact on mobile, full on desktop */}
        <div className="flex-shrink-0 sm:hidden">
          <RealTimeClock compact />
        </div>
        <div className="hidden sm:flex flex-shrink-0">
          <RealTimeClock />
        </div>

        {/* Center icons container - takes remaining space and centers content */}
        <div className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 min-w-0">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center p-1.5 sm:p-2 hover:bg-secondary rounded-full transition-all duration-200 active:scale-95"
            title="განახლება"
          >
            <RefreshCw 
              className={`w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} 
            />
          </button>

          {onSearchClick && (
            <button
              onClick={onSearchClick}
              className="p-1.5 hover:bg-secondary rounded-full transition-colors"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </button>
          )}
          
          
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
          
          {user && (
            <button
              onClick={handleOpenVisitors}
              className="relative p-1.5 hover:bg-secondary rounded-full transition-colors"
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              {visitorsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-primary text-primary-foreground text-[9px] font-medium rounded-full flex items-center justify-center px-0.5 animate-pulse">
                  {visitorsCount > 99 ? '99+' : visitorsCount}
                </span>
              )}
            </button>
          )}
        </div>
        
        {/* Right side - Avatar and Menu */}
        <div className="flex-shrink-0 flex items-center gap-0.5 sm:gap-1">
          {profile && (
            <button
              onClick={handleOwnProfileClick}
              className="p-0.5 hover:bg-secondary rounded-full transition-colors"
            >
              <Avatar className="w-6 h-6 sm:w-7 sm:h-7">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.username} className="object-cover" />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {profile.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          )}
          
          <button 
            onClick={onMenuClick}
            className="p-1.5 hover:bg-secondary rounded-full transition-colors"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
      
        <ProfileVisitors 
          isOpen={showVisitorsModal} 
          onClose={() => setShowVisitorsModal(false)}
          onNavigateToProfile={handleNavigateToProfile}
        />
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
