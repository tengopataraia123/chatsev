import { ReactNode } from 'react';
import DesktopSidebarNew from './DesktopSidebarNew';
import DesktopTopbarNew from './DesktopTopbarNew';
import DesktopRightPanel from './DesktopRightPanel';
import { cn } from '@/lib/utils';

interface DesktopLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreatePost: () => void;
  onSignOut: () => void;
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
  showRightPanel?: boolean;
}

const DesktopLayout = ({
  children,
  activeTab,
  onTabChange,
  onCreatePost,
  onSignOut,
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
  showRightPanel = true
}: DesktopLayoutProps) => {
  // Views that should hide right panel (full-width content)
  const hideRightPanelViews = [
    'chat', 'settings', 'admin', 'games', 
    'videos', 'movies', 'music', 'profile', 'user-profile',
    'quizzes', 'forums', 'blogs', 'groups',
    'photos', 'friends-list', 'online-users', 'polls'
  ];
  
  const shouldShowRightPanel = showRightPanel && !hideRightPanelViews.includes(activeTab);

  // Full-height views that need flex layout (no scroll on outer container)
  const fullHeightViews = ['chat', 'group-chat', 'settings', 'admin', 'room-chat', 'games'];
  const isFullHeight = fullHeightViews.includes(activeTab);

  return (
    <div className="hidden lg:flex h-screen bg-secondary/20 w-full overflow-hidden">
      {/* Fixed Left Sidebar */}
      <DesktopSidebarNew
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCreatePost={onCreatePost}
        onSignOut={onSignOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <DesktopTopbarNew
          onSearchClick={onSearchClick}
          onUserClick={onUserClick}
          onGroupChatNavigate={onGroupChatNavigate}
          onRightDrawerToggle={onRightDrawerToggle}
          onMessagesClick={onMessagesClick}
          onCreateStory={onCreateStory}
          onPostClick={onPostClick}
          onStoryClick={onStoryClick}
          onPollClick={onPollClick}
          onQuizClick={onQuizClick}
          onVideoClick={onVideoClick}
          onTabChange={onTabChange}
        />

        {/* Content with optional right panel */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Center Content */}
          <main 
            data-scroll-container
            className={cn(
            "flex-1 min-w-0",
            isFullHeight ? "flex flex-col overflow-hidden" : "overflow-y-auto scrollbar-thin"
          )}>
            <div className={cn(
              isFullHeight ? "flex-1 flex flex-col overflow-hidden" : "py-5",
              !isFullHeight && "px-4 w-full"
            )}>
              {children}
            </div>
          </main>

          {/* Right Panel - Contextual */}
          {shouldShowRightPanel && (
            <DesktopRightPanel onUserClick={onUserClick} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopLayout;
