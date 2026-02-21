import { ReactNode, memo, useState } from 'react';
import FacebookSidebar from './FacebookSidebar';
import FacebookTopbar from './FacebookTopbar';
import FacebookRightPanel from './FacebookRightPanel';

interface FacebookLayoutProps {
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
  onReelClick?: (reelId: string) => void;
  onDatingClick?: (tab: 'discover' | 'matches' | 'likes') => void;
  showRightPanel?: boolean;
}

const FacebookLayout = memo(({
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
  onReelClick,
  onDatingClick,
  showRightPanel = true
}: FacebookLayoutProps) => {
  // Views that should hide right panel
  const hideRightPanelViews = [
    'chat', 'group-chat', 'settings', 'admin', 
    'videos', 'movies', 'music', 'profile', 'user-profile'
  ];
  
  const shouldShowRightPanel = showRightPanel && !hideRightPanelViews.includes(activeTab);

  // Views that need full height (no overflow scroll on main)
  const fullHeightViews = ['chat', 'group-chat', 'settings'];
  const isFullHeight = fullHeightViews.includes(activeTab);

  return (
    <div className="hidden lg:flex h-screen w-full bg-background">
      {/* Fixed Left Sidebar - Facebook style */}
      <FacebookSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCreatePost={onCreatePost}
        onSignOut={onSignOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Top Bar - Facebook style */}
        <FacebookTopbar
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
          onReelClick={onReelClick}
          onDatingClick={onDatingClick}
        />

        {/* Content with optional right panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center Content - Full width stretch */}
          <main className={`flex-1 ${isFullHeight ? 'flex flex-col overflow-hidden' : 'overflow-y-auto fb-scrollbar'} bg-background`}>
            <div className={`${isFullHeight ? 'flex-1 flex flex-col overflow-hidden' : 'px-0 py-4'}`}>
              {children}
            </div>
          </main>

          {/* Right Panel - Messenger style */}
          {shouldShowRightPanel && (
            <FacebookRightPanel 
              onUserClick={onUserClick} 
              onMessagesClick={onMessagesClick}
            />
          )}
        </div>
      </div>
    </div>
  );
});

FacebookLayout.displayName = 'FacebookLayout';

export default FacebookLayout;
