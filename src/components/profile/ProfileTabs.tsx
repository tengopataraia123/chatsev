import { Grid3X3, User, Users, Image, Video, Film, MoreHorizontal, Heart, Bookmark, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ProfileTab = 'posts' | 'about' | 'friends' | 'photos' | 'videos' | 'reels' | 'saved' | 'liked' | 'subscribers';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isOwnProfile: boolean;
  counts?: {
    posts: number;
    friends: number;
    photos: number;
    videos: number;
  };
}

const ProfileTabs = ({
  activeTab,
  onTabChange,
  isOwnProfile,
  counts,
}: ProfileTabsProps) => {
  const mainTabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'posts', label: 'პოსტები', icon: <Grid3X3 className="w-5 h-5" /> },
    { id: 'about', label: 'შესახებ', icon: <User className="w-5 h-5" /> },
    { id: 'friends', label: 'მეგობრები', icon: <Users className="w-5 h-5" /> },
    { id: 'photos', label: 'ფოტოები', icon: <Image className="w-5 h-5" /> },
    { id: 'videos', label: 'ვიდეოები', icon: <Video className="w-5 h-5" /> },
  ];

  const moreTabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'subscribers', label: 'გამომწერები', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'reels', label: 'Reels', icon: <Film className="w-4 h-4" /> },
    ...(isOwnProfile ? [
      { id: 'saved' as ProfileTab, label: 'შენახული', icon: <Bookmark className="w-4 h-4" /> },
      { id: 'liked' as ProfileTab, label: 'მოწონებული', icon: <Heart className="w-4 h-4" /> },
    ] : []),
  ];

  const isMoreTabActive = moreTabs.some(tab => tab.id === activeTab);

  return (
    <div className="border-b border-border bg-card sticky top-0 z-10 w-full overflow-hidden">
      <style>{`
        .profile-tabs-container {
          display: flex;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          touch-action: pan-x;
          overscroll-behavior-x: contain;
          -ms-overflow-style: none;
          scrollbar-width: none;
          white-space: nowrap;
          width: 100%;
          max-width: 100vw;
          padding-left: 0.5rem;
          padding-right: 0.5rem;
        }
        .profile-tabs-container::-webkit-scrollbar { display: none; height: 0; width: 0; }
        @media (max-width: 768px) {
          .profile-tabs-container {
            gap: 0;
          }
          .profile-tabs-container button {
            min-width: 48px;
            min-height: 44px;
          }
        }
      `}</style>
      <div className="w-full px-0 sm:px-8">
        <nav className="profile-tabs-container items-center gap-0 sm:gap-1 -mb-px">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label}</span>
              {counts && tab.id === 'posts' && counts.posts > 0 && (
                <span className="text-[10px] sm:text-xs bg-secondary px-1.5 sm:px-2 py-0.5 rounded-full">{counts.posts}</span>
              )}
              {counts && tab.id === 'friends' && counts.friends > 0 && (
                <span className="text-[10px] sm:text-xs bg-secondary px-1.5 sm:px-2 py-0.5 rounded-full">{counts.friends}</span>
              )}
            </button>
          ))}

          {/* More Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
                  isMoreTabActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">სხვა</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {moreTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(activeTab === tab.id && "bg-primary/10 text-primary")}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  );
};

export default ProfileTabs;
