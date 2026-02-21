import { 
  Home, Search, MessageCircle, Users, Film, Image, 
  MessageSquare, Video, Heart, Gamepad2, Settings,
  User, Shield, Music, BookOpen, BarChart3, Plus,
  LogOut, Bookmark, Trophy, Globe, Palette, ImagePlay,
  UsersRound, Clapperboard, MapPin, Clock, Lightbulb, Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import { useNavigate } from 'react-router-dom';

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreatePost: () => void;
  onSignOut?: () => void;
}

const DesktopSidebar = ({ activeTab, onTabChange, onCreatePost, onSignOut }: DesktopSidebarProps) => {
  const { isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // A) MAIN NAVIGATION (CORE)
  const mainNavItems = [
    { id: 'home', label: t.home || 'მთავარი', icon: Home },
    { id: 'group-chat', label: t.groupChat || 'ჯგუფური ჩატი', icon: Users },
    { id: 'chat', label: t.messages || 'შეტყობინებები', icon: MessageCircle },
    { id: 'online-users', label: t.online || 'online', icon: User },
    { id: 'videos', label: t.videos || 'ვიდეოები', icon: Video },
    { id: 'movies', label: 'ფილმები', icon: Clapperboard },
    { id: 'photos', label: 'ფოტოები', icon: Image },
    { id: 'music', label: t.music || 'მუსიკა', icon: Music },
    { id: 'blogs', label: t.blogs || 'ბლოგი', icon: BookOpen },
    { id: 'forums', label: t.forums || 'ფორუმები', icon: MessageSquare },
    { id: 'groups', label: 'ჯგუფები', icon: UsersRound },
  ];

  // B) ENTERTAINMENT & SOCIAL
  const entertainmentItems = [
    { id: 'games', label: t.games || 'თამაშები', icon: Gamepad2 },
    { id: 'top-members', label: 'ტოპ წევრები', icon: Trophy },
    { id: 'polls', label: 'გამოკითხვა', icon: BarChart3 },
  ];

  // C) COMMUNITY & CONTENT
  const communityItems = [
    { id: 'saved', label: t.savedItems || 'შენახული', icon: Bookmark },
    { id: 'friends-list', label: t.friends || 'მეგობრები', icon: Users },
  ];

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
    } else {
      await signOut();
      navigate('/auth');
    }
  };

  const NavButton = ({ item, compact = false }: { item: { id: string; label: string; icon: any }; compact?: boolean }) => {
    const targetTab = item.id === 'home' ? 'feed' : item.id;
    const isActive = activeTab === item.id || (item.id === 'home' && activeTab === 'feed');
    const Icon = item.icon;

    const handleClick = () => {
      // If already on this tab, refresh the page
      if (isActive) {
        window.location.reload();
      } else {
        onTabChange(targetTab);
      }
    };

    return (
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150",
          "hover:bg-sidebar-accent group"
        )}
      >
        <Icon className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
          "text-muted-foreground group-hover:text-foreground"
        )} strokeWidth={1.75} />
        <span className={cn(
          "text-sm whitespace-nowrap transition-colors",
          "text-foreground/80 group-hover:text-foreground"
        )}>
          {item.label}
        </span>
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      {children}
    </p>
  );

  const handleLogoClick = () => {
    // If already on feed/home, refresh the page
    if (activeTab === 'feed' || activeTab === 'home') {
      window.location.reload();
    } else {
      onTabChange('feed');
    }
  };

  return (
    <aside className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-sidebar-border bg-sidebar w-60 z-40 flex-shrink-0">
      {/* Logo Header */}
      <div className="flex items-center gap-2 h-14 px-4 border-b border-sidebar-border flex-shrink-0">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={handleLogoClick}
        >
          <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" fill="none">
            <defs>
              <linearGradient id="desktopLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path 
              d="M16 28C16 28 4 20 4 12C4 8 7.5 5 11 5C13.5 5 15.5 6.5 16 8C16.5 6.5 18.5 5 21 5C24.5 5 28 8 28 12C28 20 16 28 16 28Z" 
              fill="url(#desktopLogoGradient)"
            />
            <circle cx="11" cy="13" r="1.5" fill="hsl(var(--primary-foreground))" />
            <circle cx="16" cy="13" r="1.5" fill="hsl(var(--primary-foreground))" />
            <circle cx="21" cy="13" r="1.5" fill="hsl(var(--primary-foreground))" />
          </svg>
          <span className="font-bold text-lg">
            <span className="text-foreground">Chat</span>
            <span className="text-primary">Sev</span>
          </span>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-thin">
        {/* Main Navigation */}
        <SectionLabel>ნავიგაცია</SectionLabel>
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-2 border-t border-sidebar-border" />

        {/* Entertainment */}
        <SectionLabel>გართობა</SectionLabel>
        <div className="space-y-0.5">
          {entertainmentItems.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-2 border-t border-sidebar-border" />

        {/* Community */}
        <SectionLabel>ერთობა</SectionLabel>
        <div className="space-y-0.5">
          {communityItems.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}
        </div>

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            <SectionLabel>{t.administration || 'ადმინისტრაცია'}</SectionLabel>
            <NavButton item={{ id: 'admin', label: t.admin || 'ადმინ პანელი', icon: Shield }} />
          </>
        )}
      </nav>

      {/* Bottom Section - Fixed */}
      <div className="p-2 border-t border-sidebar-border space-y-1 flex-shrink-0">
        {/* System & Settings */}
        <div className="flex items-center gap-1 px-2 py-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        
        {/* Settings */}
        <NavButton item={{ id: 'settings', label: t.settings || 'პარამეტრები', icon: Settings }} />
        
        {/* Create Post Button */}
        <button
          onClick={onCreatePost}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2 mt-2"
        >
          <Plus className="w-4 h-4" />
          {t.newPost || 'ახალი პოსტი'}
        </button>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors mt-1"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">{t.logout || 'გასვლა'}</span>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
