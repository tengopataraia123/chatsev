import { memo, useState, useCallback } from 'react';
import { 
  Home, Users, Store, Video, Gamepad2, Music, MessageCircle, 
  Settings, LogOut, ChevronDown, ChevronUp, User, Image, Bookmark,
  Trophy, HelpCircle, Flag, Calendar, Star, UserPlus, Shield, Clapperboard
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface FacebookSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreatePost: () => void;
  onSignOut: () => void;
}

const FacebookSidebar = memo(({ 
  activeTab, 
  onTabChange, 
  onCreatePost,
  onSignOut 
}: FacebookSidebarProps) => {
  const { profile, isAdmin, signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (onSignOut) {
      onSignOut();
    } else {
      await signOut();
    }
  }, [onSignOut, signOut]);

  // Main menu items
  const mainItems = [
    { id: 'home', label: profile?.username || 'პროფილი', icon: null, isProfile: true },
    { id: 'friends-list', label: 'მეგობრები', icon: Users },
    { id: 'group-chat', label: 'საუბრები', icon: MessageCircle },
    { id: 'groups', label: 'ჯგუფები', icon: Users },
    
    { id: 'videos', label: 'ვიდეო', icon: Video },
    { id: 'movies', label: 'ფილმები', icon: Clapperboard },
    { id: 'photos', label: 'ფოტოები', icon: Image },
    { id: 'saved', label: 'შენახული', icon: Bookmark },
  ];

  // Extended menu items
  const moreItems = [
    { id: 'photos', label: 'ფოტოგალერია', icon: Image },
    { id: 'games', label: 'თამაშები', icon: Gamepad2 },
    { id: 'music', label: 'მუსიკა', icon: Music },
    { id: 'marketplace', label: 'მარკეტი', icon: Store },
    { id: 'polls', label: 'გამოკითხვები', icon: Flag },
    { id: 'quizzes', label: 'ქვიზები', icon: HelpCircle },
    { id: 'blogs', label: 'ბლოგები', icon: Calendar },
    { id: 'top-members', label: 'ტოპ წევრები', icon: Trophy },
    { id: 'online-users', label: 'online', icon: UserPlus },
    { id: 'all-users', label: 'მომხმარებლები', icon: Star },
    { id: 'saved', label: 'შენახული', icon: Bookmark },
    { id: 'friends-list', label: 'მეგობრები', icon: Users },
  ];

  const NavItem = ({ 
    id, 
    label, 
    icon: Icon,
    isProfile 
  }: { 
    id: string; 
    label: string; 
    icon?: any;
    isProfile?: boolean;
  }) => {
    const isActive = activeTab === id || (id === 'home' && activeTab === 'profile');
    
    return (
      <button
        onClick={() => onTabChange(id === 'home' && isProfile ? 'profile' : id)}
        className={cn(
          "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left",
          isActive 
            ? "bg-primary/20 text-primary" 
            : "text-foreground hover:bg-secondary"
        )}
      >
        {isProfile ? (
          <Avatar className="w-9 h-9">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="bg-secondary text-foreground text-sm">
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : Icon ? (
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center",
            isActive ? "bg-primary/20" : "bg-secondary"
          )}>
            <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-foreground")} strokeWidth={1.75} />
          </div>
        ) : null}
        <span className="text-[15px] font-medium truncate">{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-[280px] h-screen bg-card border-r border-border flex flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto fb-scrollbar p-2">
        {/* Main navigation */}
        <nav className="space-y-0.5">
          {mainItems.map((item) => (
            <NavItem key={item.id} {...item} />
          ))}
          
          {/* Show More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              {showMore ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
            <span className="text-[15px] font-medium">
              {showMore ? 'ნაკლების ჩვენება' : 'მეტის ნახვა'}
            </span>
          </button>

          {/* Extended items */}
          {showMore && (
            <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200">
              {moreItems.map((item) => (
                <NavItem key={item.id} {...item} />
              ))}
            </div>
          )}
        </nav>

        {/* Divider */}
        <div className="h-px bg-border my-3" />

        {/* Shortcuts section */}
        <div className="px-2 mb-2">
          <h3 className="text-muted-foreground text-[13px] font-semibold mb-2">მალსახმობები</h3>
        </div>

        {/* Settings & Admin */}
        <nav className="space-y-0.5">
          <NavItem id="settings" label="პარამეტრები" icon={Settings} />
          {isAdmin && (
            <NavItem id="admin" label="ადმინ პანელი" icon={Shield} />
          )}
        </nav>
      </div>

      {/* Footer - Sign Out */}
      <div className="p-2 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <span className="text-[15px] font-medium text-destructive">გასვლა</span>
        </button>

        {/* Copyright */}
        <p className="text-[11px] text-muted-foreground text-center mt-2 px-2">
          ChatSev © 2026 • ყველა უფლება დაცულია
        </p>
      </div>
    </aside>
  );
});

FacebookSidebar.displayName = 'FacebookSidebar';

export default FacebookSidebar;
