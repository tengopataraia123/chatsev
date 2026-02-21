import { useState, useEffect, useCallback, useMemo, memo, startTransition, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MobileHeader from '@/components/layout/MobileHeader';

import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { DesktopLayout } from '@/components/layout/desktop';
import DesktopRightDrawer from '@/components/layout/DesktopRightDrawer';
import { BannedScreen } from '@/components/auth/BannedScreen';
import PendingApprovalScreen from '@/components/auth/PendingApprovalScreen';
import { IpBannedScreen } from '@/components/auth/IpBannedScreen';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import PullToRefresh from '@/components/shared/PullToRefresh';
import LazyLoadErrorBoundary from '@/components/shared/LazyLoadErrorBoundary';
import LoadingTimeout from '@/components/shared/LoadingTimeout';

import TopGeCounter from '@/components/TopGeCounter';
import { MusicPlayerProvider, useMusicPlayerContext } from '@/contexts/MusicPlayerContext';
// All components - eagerly loaded for instant display
import StoriesRow from '@/components/home/StoriesRow';
import HomeModulesGrid from '@/components/home/HomeModulesGrid';
import Feed from '@/components/feed/Feed';
import PostComposerBar from '@/components/feed/PostComposerBar';
import SearchView from '@/components/search/SearchView';
import MessengerPage from '@/components/messenger/MessengerPage';
import GroupChatView from '@/components/groupchat/GroupChatView';
import RoomSelector from '@/components/groupchat/RoomSelector';
import RoomChatView from '@/components/groupchat/RoomChatView';
import RoomStripWithPresence from '@/components/groupchat/RoomStripWithPresence';
import ProfileView from '@/components/profile/ProfileView';
import StoryViewerEnhanced from '@/components/stories/StoryViewerEnhanced';
import StoryCreateModal from '@/components/stories/StoryCreateModal';
import CreatePostModal from '@/components/create/CreatePostModal';
import AnnouncementPanel from '@/components/announcements/AnnouncementPanel';
import HashtagView from '@/components/hashtag/HashtagView';
import FriendsListView from '@/components/friends/FriendsListView';
import OnlineUsersView from '@/components/features/OnlineUsersView';
import GroupsView from '@/components/groups/GroupsView';
import PollsView from '@/components/features/PollsView';
import ForumsView from '@/components/features/ForumsView';
import BlogsView from '@/components/features/BlogsView';
import PhotosView from '@/components/features/PhotosView';
import AllPhotosView from '@/components/features/AllPhotosView';
import VideosView from '@/components/videos/VideosView';
import ModerationModal from '@/components/moderation/ModerationModal';
import FloatingCreateButton from '@/components/layout/FloatingCreateButton';
import MusicMiniPlayer from '@/components/music/MusicMiniPlayer';
import SettingsView from '@/components/settings/SettingsView';
import { AdminPanel } from '@/components/admin/AdminPanel';
import SubscribersView from '@/components/features/SubscribersView';
import SavedPostsView from '@/components/features/SavedPostsView';
import MusicView from '@/components/features/MusicView';
import QuizHub from '@/components/quiz/QuizHub';
import MarketplaceView from '@/components/features/MarketplaceView';
import PagesView from '@/components/features/PagesView';
import TopMembersView from '@/components/features/TopMembersView';
import AllUsersView from '@/components/features/AllUsersView';
import GamesView from '@/components/games/GamesView';
import MyProfileInfoView from '@/components/features/MyProfileInfoView';
import MoviesView from '@/components/movies/MoviesList';
import ActivityPointsView from '@/components/features/ActivityPointsView';
import VipMembersView from '@/components/features/VipMembersView';
import ProfileBackgroundSettings from '@/components/profile/ProfileBackgroundSettings';

import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useSiteBan } from '@/hooks/useSiteBan';
import { trackNavigation } from '@/lib/smartPrefetch';
import { useAdjacentPrefetch } from '@/hooks/useRoutePrefetch';
import { useIpBan } from '@/hooks/useIpBan';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { useDeviceTracking } from '@/hooks/useDeviceTracking';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';
import { useNotificationsCount } from '@/hooks/useNotificationsCount';
import { useMessengerUnreadCount } from '@/components/messenger/hooks/useMessengerUnreadCount';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';


const IndexContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  
  // Feed refresh key for pull-to-refresh
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  
  // Restore position from sessionStorage on initial load
  const [activeTab, setActiveTabState] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('app-active-tab') || 'home';
    }
    return 'home';
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showMessengerPopup, setShowMessengerPopup] = useState(false);
  const [viewUserId, setViewUserIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('app-view-user-id') || null;
    }
    return null;
  });
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [replyTrigger, setReplyTrigger] = useState<number>(0);
  const [selectedRoomTypeState, setSelectedRoomTypeState] = useState<'gossip' | 'night' | 'emigrants' | 'dj' | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('app-selected-room');
      if (stored && ['gossip', 'night', 'emigrants', 'dj'].includes(stored)) {
        return stored as 'gossip' | 'night' | 'emigrants' | 'dj';
      }
    }
    return null;
  });
  
  // Wrapper to persist selectedRoomType to sessionStorage
  const setSelectedRoomType = useCallback((room: 'gossip' | 'night' | 'emigrants' | 'dj' | null) => {
    setSelectedRoomTypeState(room);
    if (room) {
      sessionStorage.setItem('app-selected-room', room);
    } else {
      sessionStorage.removeItem('app-selected-room');
    }
  }, []);
  
  const selectedRoomType = selectedRoomTypeState;
  const [chatWithUserId, setChatWithUserIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('app-chat-user-id') || null;
    }
    return null;
  });
  
  // Wrap setters to persist to sessionStorage and use startTransition for non-urgent updates
  const setActiveTab = useCallback((tab: string) => {
    startTransition(() => {
      setActiveTabState(prev => {
        // Scroll to top on any tab change (including re-clicking same tab)
        window.scrollTo(0, 0);
        // Also reset any scrollable containers
        document.querySelectorAll('[data-scroll-container]').forEach(el => {
          el.scrollTop = 0;
        });
        return tab;
      });
      sessionStorage.setItem('app-active-tab', tab);
    });
  }, []);
  
  const setViewUserId = useCallback((userId: string | null) => {
    setViewUserIdState(userId);
    if (userId) {
      sessionStorage.setItem('app-view-user-id', userId);
    } else {
      sessionStorage.removeItem('app-view-user-id');
    }
  }, []);
  
  const setChatWithUserId = useCallback((userId: string | null) => {
    setChatWithUserIdState(userId);
    if (userId) {
      sessionStorage.setItem('app-chat-user-id', userId);
    } else {
      sessionStorage.removeItem('app-chat-user-id');
    }
  }, []);
  const { isAuthenticated, loading, profile, signOut, user, isApproved, isAdmin, isOffline, refreshProfile } = useAuth();
  const { banInfo, loading: banLoading, recheckBan } = useSiteBan(user?.id || null);
  const { ipBanInfo, clientIp } = useIpBan();
  const { unreadCount: unreadMessagesCount, refetch: refetchUnreadMessages } = useUnreadMessagesCount();
  const { unreadCount: messengerUnreadCount, refetch: refetchMessengerUnread } = useMessengerUnreadCount();
  const { unreadCount: notificationCount, refetch: refetchNotifications } = useNotificationsCount();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Stories removed - no expiration check needed
  
  // Track user's current location in the app
  useLocationTracker(activeTab, user?.id);
  
  // Track device fingerprint for super admin oversight
  useDeviceTracking();
  
  // Smart prefetch: track navigation and prefetch adjacent routes
  useEffect(() => {
    trackNavigation(activeTab);
  }, [activeTab]);

  // Sync URL bar with current view so URLs are shareable
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (activeTab === 'user-profile' && viewUserId) {
      params.set('view', 'profile');
      params.set('userId', viewUserId);
    } else if (activeTab === 'chat' && chatWithUserId) {
      params.set('view', 'profile');
      params.set('userId', chatWithUserId);
      params.set('action', 'message');
    } else if (activeTab === 'group-chat') {
      params.set('view', 'group-chat');
    } else if (activeTab === 'room-chat' && selectedRoomType) {
      params.set('view', 'room-chat');
      params.set('room', selectedRoomType);
    } else if (activeTab === 'settings') {
      params.set('view', 'settings');
    } else if (activeTab === 'notifications') {
      params.set('view', 'notifications');
    } else if (activeTab === 'polls') {
      params.set('view', 'polls');
    } else if (activeTab === 'quizzes') {
      params.set('view', 'quizzes');
    } else if (activeTab === 'games') {
      params.set('view', 'games');
    } else if (activeTab === 'videos') {
      params.set('view', 'videos');
    } else if (activeTab === 'online-users') {
      params.set('view', 'online');
    } else if (activeTab === 'profile') {
      params.set('view', 'my-profile');
    } else if (activeTab === 'messenger') {
      params.set('view', 'messenger');
    }
    
    const paramString = params.toString();
    const newUrl = paramString ? `${window.location.pathname}?${paramString}` : window.location.pathname;
    
    // Use replaceState to update URL without triggering navigation/re-render
    window.history.replaceState(null, '', newUrl);
  }, [activeTab, viewUserId, chatWithUserId, selectedRoomType]);
  
  // Prefetch likely next routes based on current tab
  useAdjacentPrefetch(activeTab);

  
  // State for opening story from notification
  const [openStoryUserId, setOpenStoryUserId] = useState<string | null>(null);
  const [storyUserIds, setStoryUserIds] = useState<string[]>([]);
  
  // State for scrolling to a specific post
  const [scrollToPostId, setScrollToPostId] = useState<string | null>(null);
  
  // State for game room navigation from notifications
  const [pendingGameRoom, setPendingGameRoom] = useState<{ roomId: string; gameType: string } | null>(null);
  const [pendingWWWRoom, setPendingWWWRoom] = useState<string | null>(null);
  
  // Live streaming removed

  // Check sessionStorage for story/post navigation on mount or when returning home
  useEffect(() => {
    if (activeTab === 'home') {
      const storedStoryUserId = sessionStorage.getItem('openStoryUserId');
      if (storedStoryUserId) {
        setOpenStoryUserId(storedStoryUserId);
        sessionStorage.removeItem('openStoryUserId');
      }
      
      const storedPostId = sessionStorage.getItem('scrollToPostId');
      if (storedPostId) {
        setScrollToPostId(storedPostId);
        sessionStorage.removeItem('scrollToPostId');
      }
    }
  }, [activeTab]);

  // Handle URL query params for navigation (e.g., ?view=profile&userId=xxx)
  // This only runs on initial load or when URL changes externally (e.g., clicking a shared link)
  const lastHandledParams = useRef<string>('');
  useEffect(() => {
    const view = searchParams.get('view');
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');
    const groupId = searchParams.get('group');
    const action = searchParams.get('action');
    const room = searchParams.get('room');
    
    if (!view) {
      lastHandledParams.current = '';
      return;
    }
    
    // Build a fingerprint of current params to detect actual changes
    const paramsFingerprint = `${view}|${userId}|${username}|${groupId}|${action}|${room}`;
    
    // Skip if we already handled these exact params (prevents re-processing from URL sync)
    if (lastHandledParams.current === paramsFingerprint) return;
    lastHandledParams.current = paramsFingerprint;
    
    // Handle username-based profile lookup
    const handleUsernameProfile = async (uname: string) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('username', uname)
          .maybeSingle();
        
        if (data?.user_id) {
          if (action === 'message') {
            setChatWithUserId(data.user_id);
            setActiveTab('chat');
          } else {
            setViewUserId(data.user_id);
            setActiveTab('user-profile');
          }
        }
      } catch (err) {
        console.error('Error looking up username:', err);
      }
    };
    
    if (view === 'profile' && username) {
      handleUsernameProfile(username);
      return;
    }
    
    if (view === 'profile' && userId) {
      if (action === 'message') {
        setChatWithUserId(userId);
        setActiveTab('chat');
      } else {
        setViewUserId(userId);
        setActiveTab('user-profile');
      }
    } else if (view === 'settings') {
      setActiveTab('settings');
    } else if (view === 'notifications') {
      setActiveTab('notifications');
    } else if (view === 'group-chat') {
      setActiveTab('group-chat');
    } else if (view === 'room-chat' && room) {
      if (['gossip', 'night', 'emigrants', 'dj'].includes(room)) {
        setSelectedRoomType(room as 'gossip' | 'night' | 'emigrants' | 'dj');
        setActiveTab('room-chat');
      }
    } else if (view === 'polls') {
      setActiveTab('polls');
    } else if (view === 'quizzes') {
      setActiveTab('quizzes');
    } else if (view === 'games') {
      setActiveTab('games');
    } else if (view === 'videos') {
      setActiveTab('videos');
    } else if (view === 'online') {
      setActiveTab('online-users');
    } else if (view === 'my-profile') {
      setActiveTab('profile');
    } else if (view === 'messenger') {
      setActiveTab('messenger');
    }
    
  }, [searchParams]);

  // Retry function for loading timeout
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Real-time ban subscription - heavily deferred to avoid blocking
  useEffect(() => {
    if (!user?.id) return;

    // Delay subscription setup significantly - 20 seconds (even more deferred)
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel('user-ban-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'site_bans',
            filter: `user_id=eq.${user.id}`
          },
          () => recheckBan()
        )
        .subscribe();

      // Store channel ref for cleanup
      return () => {
        supabase.removeChannel(channel);
      };
    }, 20000); // Increased from 10s to 20s

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.id, recheckBan]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  const handleTabChange = (tab: string) => {
    if (tab === 'create') {
      setShowCreateModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleStoryClick = useCallback((action: string) => {
    if (action === 'online') {
      setActiveTab('online-users');
    } else if (action === 'quizzes') {
      setActiveTab('quizzes');
    } else if (action === 'movies') {
      setActiveTab('movies');
    }
  }, []);

  const handleUserClick = useCallback((userId: string) => {
    if (user?.id === userId) {
      setActiveTab('profile');
      return;
    }
    setViewUserId(userId);
    setActiveTab('user-profile');
  }, [user?.id]);

  const handleGroupChatNavigate = useCallback((messageId: string, username?: string, roomType?: string) => {
    setHighlightMessageId(messageId);
    setReplyToUsername(username || null);
    setReplyTrigger(prev => prev + 1); // Increment trigger to force re-run of effect
    
    // Navigate to the specific room based on roomType
    if (roomType && ['gossip', 'night', 'emigrants', 'dj'].includes(roomType)) {
      setSelectedRoomType(roomType as 'gossip' | 'night' | 'emigrants' | 'dj');
      setActiveTab('room-chat');
    } else {
      setActiveTab('group-chat');
    }
  }, []);

  const handleGroupClick = useCallback((groupId: string) => {
    sessionStorage.setItem('openGroupId', groupId);
    setActiveTab('groups');
  }, []);

  // Handle navigation to specific posts from notifications
  const handlePostClick = useCallback((postId: string) => {
    sessionStorage.setItem('scrollToPostId', postId);
    setActiveTab('home');
  }, []);

  // Handle navigation to friend's story from notification
  const handleFriendStoryClick = useCallback((userId: string) => {
    sessionStorage.setItem('openStoryUserId', userId);
    setActiveTab('home');
  }, []);

  // Handle navigation to specific poll
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const handlePollClick = useCallback((pollId: string) => {
    setSelectedPollId(pollId);
    setActiveTab('polls');
  }, []);

  // Handle navigation to specific quiz
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const handleQuizClick = useCallback((quizId: string) => {
    setSelectedQuizId(quizId);
    setActiveTab('quizzes');
  }, []);

  // Reels removed

  // Handle navigation to specific video
  const handleVideoClick = useCallback((videoId: string) => {
    sessionStorage.setItem('openVideoId', videoId);
    setActiveTab('videos');
  }, []);


  // Dating module removed

  // Handle navigation to game room from notification invite
  const handleGameInviteAccepted = useCallback((roomId: string, gameType: string) => {
    // Handle WWW game separately - it's in quizzes section
    if (gameType.toLowerCase() === 'www') {
      setPendingWWWRoom(roomId);
      setActiveTab('quizzes');
      return;
    }
    
    setPendingGameRoom({ roomId, gameType });
    setActiveTab('games');
  }, []);

  const handleNavigate = (page: string) => {
    setSidebarOpen(false);
    
    // Special case for install - navigate to /install route
    if (page === 'install') {
      navigate('/install');
      return;
    }
    
    const directViews = [
      'group-chat', 'settings', 'photos', 'my-photos', 'all-photos', 'subscribers', 'saved', 'admin',
      'forums', 'music', 'quizzes', 'polls', 'marketplace', 'groups', 'pages', 'blogs', 'online-users',
      'friends-list', 'chat', 'all-users', 'games', 'shop', 'videos', 'movies', 'top-members', 'my-profile-info',
      'profile-background', 'activity-points', 'vip-members'
    ];

    if (directViews.includes(page)) {
      setActiveTab(page);
      return;
    }

    toast({
      title: t.comingSoon,
      description: t.featureComingSoon,
    });
  };

  // Check if we're on main view (home)
  const isMainView = useMemo(() => {
    return activeTab === 'home' || activeTab === 'profile';
  }, [activeTab]);

  // Handle back navigation for mobile back button
  const handleBackNavigation = useCallback(() => {
    // Reset any user-specific state
    setViewUserId(null);
    setChatWithUserId(null);
    setHighlightMessageId(null);
    setReplyToUsername(null);
    setActiveTab('home');
  }, []);

  // Use back navigation hook
  useBackNavigation({
    activeTab,
    viewUserId,
    onNavigateBack: handleBackNavigation,
    isMainView
  });

  // Show loading only if auth is loading - extended timeout for slow mobile networks
  if (loading) {
    return (
      <LoadingTimeout 
        loading={loading} 
        timeout={12000}
        loadingMessage={t.loading}
        onRetry={handleRetry}
      >
        <div />
      </LoadingTimeout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show IP banned screen first (before auth check)
  if (ipBanInfo?.is_banned) {
    return (
      <IpBannedScreen 
        ipBanInfo={ipBanInfo}
        clientIp={clientIp}
      />
    );
  }

  // Show banned screen if user is site banned
  if (banInfo?.is_banned) {
    return (
      <BannedScreen 
        banInfo={banInfo as any}
        onSignOut={signOut}
      />
    );
  }

  // Show pending approval screen ONLY for users who are explicitly not approved (is_approved === false)
  // Don't show if is_approved is true or if user is admin/moderator
  if (profile && profile.is_approved === false && !isAdmin) {
    return (
      <PendingApprovalScreen 
        onSignOut={signOut} 
        onRefresh={refreshProfile}
        t={t}
      />
    );
  }

  const renderContent = () => {
    // Wrap components in ErrorBoundary for safety
    const wrapLazy = (component: React.ReactNode) => (
      <ErrorBoundary>
        {component}
      </ErrorBoundary>
    );

    switch (activeTab) {
      case 'search':
        return wrapLazy(<SearchView onClose={() => setActiveTab('home')} onUserClick={handleUserClick} />);
      case 'live':
        // Live streaming removed - redirect to home
        return null;
      // Reels removed
      case 'chat':
        return wrapLazy(
          <MessengerPage 
            initialUserId={chatWithUserId} 
            onClearInitialUser={() => setChatWithUserId(null)}
            onBack={() => setActiveTab('home')}
          />
        );
      case 'group-chat':
        // If a specific room is selected, show RoomChatView
        if (selectedRoomType) {
          return wrapLazy(
            <RoomChatView 
              roomType={selectedRoomType} 
              onBack={() => { 
                setSelectedRoomType(null); 
                // Go back to room selector, not home
              }} 
              onNavigateToProfile={handleUserClick} 
              highlightMessageId={highlightMessageId} 
              replyToUsername={replyToUsername} 
              replyTrigger={replyTrigger} 
            />
          );
        }
        // Otherwise show room selector
        return wrapLazy(
          <RoomSelector 
            onSelectRoom={(room) => setSelectedRoomType(room)} 
            onBack={() => { 
              setActiveTab('home'); 
              setHighlightMessageId(null); 
              setReplyToUsername(null); 
            }} 
          />
        );
      case 'settings':
        return wrapLazy(<SettingsView onBack={() => setActiveTab('home')} />);
      case 'admin':
        return wrapLazy(<AdminPanel onBack={() => setActiveTab('home')} />);
      // Story archive, gamification, analytics, activity points removed
      case 'my-profile-info':
        return wrapLazy(<MyProfileInfoView onBack={() => setActiveTab('home')} />);
      case 'subscribers':
        return wrapLazy(<SubscribersView onBack={() => setActiveTab('home')} />);
      case 'saved':
        return wrapLazy(<SavedPostsView onBack={() => setActiveTab('home')} />);
      case 'photos':
        return wrapLazy(<AllPhotosView onBack={() => setActiveTab('home')} onUserClick={(userId) => { setViewUserId(userId); setActiveTab('user-profile'); }} />);
      case 'my-photos':
        return wrapLazy(<PhotosView onBack={() => setActiveTab('home')} />);
      case 'forums':
        return wrapLazy(<ForumsView onBack={() => setActiveTab('home')} />);
      case 'music':
        return wrapLazy(<MusicView onBack={() => setActiveTab('home')} />);
      case 'quizzes':
        return wrapLazy(<QuizHub onBack={() => setActiveTab('home')} />);
      case 'polls':
        return wrapLazy(<PollsView onBack={() => { setActiveTab('home'); setSelectedPollId(null); }} onUserClick={handleUserClick} initialPollId={selectedPollId} />);
      case 'marketplace':
        return wrapLazy(<MarketplaceView onBack={() => setActiveTab('home')} />);
      case 'pages':
        return wrapLazy(<PagesView onBack={() => setActiveTab('home')} />);
      case 'groups':
        return wrapLazy(<GroupsView onBack={() => setActiveTab('home')} onUserClick={handleUserClick} />);
      case 'blogs':
        return wrapLazy(<BlogsView onBack={() => setActiveTab('home')} onUserClick={handleUserClick} />);
      // Dating module removed
      case 'online-users':
        return wrapLazy(
          <OnlineUsersView 
            onBack={() => setActiveTab('home')} 
            onUserClick={handleUserClick}
            onMessageClick={(userId) => {
              setChatWithUserId(userId);
              setActiveTab('chat');
            }}
          />
        );
      case 'all-users':
        return wrapLazy(
          <AllUsersView 
            onBack={() => setActiveTab('home')} 
            onUserClick={handleUserClick}
            onMessageClick={(userId) => {
              setChatWithUserId(userId);
              setActiveTab('chat');
            }}
          />
        );
      case 'top-members':
        return wrapLazy(
          <TopMembersView 
            onBack={() => setActiveTab('home')} 
            onUserClick={handleUserClick}
          />
        );
      case 'activity-points':
        return wrapLazy(<ActivityPointsView onBack={() => setActiveTab('home')} onTabChange={handleTabChange} />);
      case 'vip-members':
        return wrapLazy(<VipMembersView onBack={() => setActiveTab('home')} onUserClick={handleUserClick} />);
      case 'games':
        return wrapLazy(<GamesView onBack={() => setActiveTab('home')} />);
      case 'videos':
        return wrapLazy(<VideosView onBack={() => setActiveTab('home')} onUserClick={handleUserClick} />);
      case 'movies':
        return wrapLazy(<MoviesView />);
      case 'profile-background':
        return wrapLazy(<ProfileBackgroundSettings onBack={() => setActiveTab('home')} />);
      case 'shop':
        // Shop removed - redirect to home
        setActiveTab('home');
        return null;
      case 'friends-list':
        return wrapLazy(
          <FriendsListView 
            onBack={() => setActiveTab('home')} 
            onUserClick={handleUserClick}
            onMessage={(userId) => {
              setChatWithUserId(userId);
              setActiveTab('chat');
            }}
          />
        );
      case 'user-profile':
        return wrapLazy(
          <ProfileView 
            profile={null}
            viewUserId={viewUserId || undefined}
            onSettings={() => setActiveTab('settings')}
            onMessage={(userId) => {
              setChatWithUserId(userId);
              setActiveTab('chat');
            }}
            onBack={() => setActiveTab('home')}
          />
        );
      case 'hashtag':
        return wrapLazy(
          <HashtagView 
            hashtag={selectedHashtag || ''}
            onBack={() => { setActiveTab('home'); setSelectedHashtag(null); }}
            onUserClick={handleUserClick}
            onHashtagClick={(tag) => setSelectedHashtag(tag)}
          />
        );
      case 'profile':
        return wrapLazy(
          <ProfileView 
            profile={profile} 
            onEditProfile={() => {}}
            onSettings={() => setActiveTab('settings')}
            onMessage={(userId) => {
              setChatWithUserId(userId);
              setActiveTab('chat');
            }}
          />
        );
      default:
        return (
          <ErrorBoundary>
            {/* Announcement Panel - Top of Home */}
            <AnnouncementPanel />
            {/* Live streaming removed */}
            {/* Stories Row */}
            <StoriesRow 
              onCreateStory={() => setShowStoryModal(true)}
              onStoryClick={(userId, allUserIds) => {
                setOpenStoryUserId(userId);
                if (allUserIds) setStoryUserIds(allUserIds);
              }}
            />
            {/* Home Modules Grid - Group Rooms + Quick Access Cards */}
            <HomeModulesGrid 
              onNavigate={handleNavigate}
              onGroupChatClick={() => setActiveTab('group-chat')}
              onRoomClick={(roomId) => {
                setSelectedRoomType(roomId);
                setActiveTab('group-chat');
              }}
            />
            {/* Facebook-style Post Composer Bar */}
            <PostComposerBar onOpenModal={() => setShowCreateModal(true)} />
            <div className="px-0">
              <Feed 
                key={feedRefreshKey}
                onUserClick={handleUserClick} 
                onLiveClick={() => setActiveTab('live')} 
                onGroupClick={handleGroupClick}
                onHashtagClick={(tag) => {
                  setSelectedHashtag(tag);
                  setActiveTab('hashtag');
                }}
                scrollToPostId={scrollToPostId}
                onScrollToPostComplete={() => setScrollToPostId(null)}
              />
            </div>
          </ErrorBoundary>
        );
    }
  };

  // Views where we hide ONLY bottom nav (fullscreen immersive views only)
  const hideBottomNavViews = ['live', 'group-chat', 'room-chat', 'admin', 'games', 'chat'];

  // Views where we hide the mobile header (fullscreen chat views)
  const hideMobileHeaderViews = ['chat'];

  // Header should be visible except in fullscreen chat views
  const shouldShowMobileHeader = !hideMobileHeaderViews.includes(activeTab);
  const shouldShowHeader = true;
  const shouldShowBottomNav = !hideBottomNavViews.includes(activeTab);
  // Views that should hide right panel
  const hideRightPanelViews = [
    'chat', 'group-chat', 'settings', 'admin', 'games', 
    'videos', 'music', 'profile', 'user-profile'
  ];
  const shouldShowRightPanel = !hideRightPanelViews.includes(activeTab);

  // Unified layout - same UI for mobile and desktop (desktop is just centered)
  const layoutContent = (
    <div className="h-[100dvh] bg-background flex flex-col w-full max-w-full">
      {/* Header - ALWAYS visible at top */}
      {shouldShowMobileHeader && (
        <div className="flex-shrink-0 z-50 bg-card">
          <MobileHeader 
            onMenuClick={() => setSidebarOpen(true)} 
            onUserClick={handleUserClick}
            onSearchClick={() => setActiveTab('search')}
            onGroupChatNavigate={handleGroupChatNavigate}
            onCreateStory={() => setShowStoryModal(true)}
            onLogoClick={() => {
              if (activeTab === 'home' || activeTab === 'feed') {
                window.location.reload();
              } else {
                setActiveTab('home');
              }
            }}
            onPostClick={handlePostClick}
            onStoryClick={handleFriendStoryClick}
            onPollClick={handlePollClick}
            onQuizClick={handleQuizClick}
            onVideoClick={handleVideoClick}
            onReelClick={() => {}}
            onDatingClick={() => {}}
            onGameInviteAccepted={handleGameInviteAccepted}
            onCreatePost={() => setShowCreateModal(true)}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onMessagesClick={() => {
              setChatWithUserId(null);
              setActiveTab('chat');
              refetchUnreadMessages();
              refetchMessengerUnread();
            }}
            unreadMessagesCount={unreadMessagesCount + messengerUnreadCount}
            notificationCount={notificationCount}
            onNotificationCountChange={refetchNotifications}
          />
        </div>
      )}
      
      {/* Main Content Area - Scrollable */}
      <main 
        data-scroll-container
        className={`flex-1 min-h-0 overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)] ${['group-chat', 'chat'].includes(activeTab) ? 'flex flex-col !overflow-hidden' : ['settings'].includes(activeTab) ? 'flex flex-col !overflow-hidden' : ''}`}
      >
          {['group-chat', 'chat', 'settings'].includes(activeTab) ? (
            <div className="h-full flex flex-col overflow-hidden w-full min-h-full">
              {renderContent()}
            </div>
          ) : (
            <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
              <div className="w-full min-h-full">
                {renderContent()}
                <TopGeCounter />
              </div>
            </PullToRefresh>
          )}
          
          {['group-chat', 'chat', 'settings', 'live'].includes(activeTab) && null}
      </main>
      
    </div>
  );

  return (
    <>
      {/* Desktop: 3-panel Social Center layout */}
      <DesktopLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreatePost={() => setShowCreateModal(true)}
        onSignOut={signOut}
        onSearchClick={() => setActiveTab('search')}
        onUserClick={handleUserClick}
        onGroupChatNavigate={handleGroupChatNavigate}
        onRightDrawerToggle={() => setRightDrawerOpen(!rightDrawerOpen)}
        onMessagesClick={() => {
          setChatWithUserId(null);
          setActiveTab('chat');
          refetchUnreadMessages();
          refetchMessengerUnread();
        }}
        onCreateStory={() => setShowStoryModal(true)}
        onPostClick={handlePostClick}
        onStoryClick={handleFriendStoryClick}
        onPollClick={handlePollClick}
        onQuizClick={handleQuizClick}
        onVideoClick={handleVideoClick}
      >
        {renderContent()}
      </DesktopLayout>
      
      {/* Mobile: Direct layout (unchanged) */}
      <div className="lg:hidden">
        {layoutContent}
      </div>

      {/* Mobile Sidebar - Unchanged */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        profile={profile}
        onSignOut={signOut}
        onNavigate={handleNavigate}
      />

      {/* Desktop Right Drawer (Profile & Settings) */}
      <DesktopRightDrawer
        isOpen={rightDrawerOpen}
        onClose={() => setRightDrawerOpen(false)}
        profile={profile}
        onSignOut={signOut}
        onNavigate={handleNavigate}
      />

      <LazyLoadErrorBoundary>
          <CreatePostModal 
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />

          {/* Moderation Modal for Admins */}
          <ModerationModal />
      </LazyLoadErrorBoundary>

      {/* Story Viewer Modal */}
      {openStoryUserId && (
          <StoryViewerEnhanced
            userId={openStoryUserId}
            onClose={() => {
              setOpenStoryUserId(null);
              setStoryUserIds([]);
            }}
            onUserClick={(userId) => {
              setOpenStoryUserId(null);
              setStoryUserIds([]);
              handleUserClick(userId);
            }}
            hasNextUser={storyUserIds.length > 0 && storyUserIds.indexOf(openStoryUserId) < storyUserIds.length - 1}
            hasPrevUser={storyUserIds.length > 0 && storyUserIds.indexOf(openStoryUserId) > 0}
            onNextUser={() => {
              const currentIdx = storyUserIds.indexOf(openStoryUserId);
              if (currentIdx < storyUserIds.length - 1) {
                setOpenStoryUserId(storyUserIds[currentIdx + 1]);
              }
            }}
            onPrevUser={() => {
              const currentIdx = storyUserIds.indexOf(openStoryUserId);
              if (currentIdx > 0) {
                setOpenStoryUserId(storyUserIds[currentIdx - 1]);
              }
            }}
          />
      )}

      {/* Story Create Modal */}
      {showStoryModal && (
          <StoryCreateModal
            isOpen={showStoryModal}
            onClose={() => setShowStoryModal(false)}
            onSuccess={() => {
              // Refresh stories row
              setFeedRefreshKey(prev => prev + 1);
            }}
          />
      )}

    </>
  );
};

// Wrapper to add global music mini player (TopGeCounter moved inside IndexContent for conditional rendering)
const IndexWithMusicPlayer = () => {
  const player = useMusicPlayerContext();
  
  return (
    <>
      <IndexContent />
      
      {/* Global Music Mini Player - shows on all pages when music is playing */}
      {player.currentTrack && !player.isExpanded && !player.showQueue && (
        <MusicMiniPlayer
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          onPlayPause={player.togglePlayPause}
          onNext={player.handleNext}
          onClose={player.closePlayer}
          onExpand={player.toggleExpand}
          currentTime={player.currentTime}
          duration={player.duration}
        />
      )}
    </>
  );
};

const Index = () => {
  return (
    <MusicPlayerProvider>
      <IndexWithMusicPlayer />
    </MusicPlayerProvider>
  );
};

export default Index;