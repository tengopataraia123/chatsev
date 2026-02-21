import { useState, useEffect } from 'react';
import { 
  Home, MessageCircle, Users, Film, Image, 
  MessageSquare, Video, Heart, Gamepad2, Settings,
  User, Shield, Music, BookOpen, BarChart3, Plus,
  LogOut, Bookmark, Trophy, UsersRound, Sparkles,
  ChevronDown, ChevronRight, Clapperboard, Briefcase,
  Ghost, Dumbbell, ListMusic, MapPin, Clock, Lightbulb,
  Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

interface DesktopSidebarNewProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreatePost: () => void;
  onSignOut?: () => void;
}

const DesktopSidebarNew = ({ activeTab, onTabChange, onCreatePost, onSignOut }: DesktopSidebarNewProps) => {
  const { isAdmin, signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userPoints, setUserPoints] = useState(0);
  const [openSections, setOpenSections] = useState({
    main: true,
    entertainment: true,
    community: true,
    admin: true
  });

  useEffect(() => {
    if (!user) return;
    const fetchPoints = async () => {
      const { data } = await (supabase as any)
        .from('user_points_wallet')
        .select('balance_points')
        .eq('user_id', user.id)
        .single();
      if (data) setUserPoints(data.balance_points);
    };
    fetchPoints();
    const channel = supabase
      .channel('sidebar-points')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points_wallet', filter: `user_id=eq.${user.id}` }, (payload) => {
        setUserPoints((payload.new as any).balance_points || 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Navigation items with grouping
  const mainNavItems = [
    { id: 'home', label: t.home || 'მთავარი', icon: Home },
    { id: 'online-users', label: t.online || 'online', icon: User },
    { id: 'chat', label: t.messages || 'შეტყობინებები', icon: MessageCircle },
    { id: 'group-chat', label: t.groupChat || 'ჯგუფური ჩატი', icon: Users },
    { id: 'videos', label: t.videos || 'ვიდეოები', icon: Video },
    { id: 'movies', label: 'ფილმები', icon: Clapperboard },
    { id: 'photos', label: 'ფოტოები', icon: Image },
    { id: 'music', label: t.music || 'მუსიკა', icon: Music },
    { id: 'blogs', label: t.blogs || 'ბლოგი', icon: BookOpen },
  ];

  const entertainmentItems = [
    { id: 'games', label: t.games || 'თამაშები', icon: Gamepad2 },
    { id: 'activity-points', label: 'აქტივობის ქულები', icon: Star },
    { id: 'vip-members', label: 'VIP მომხმარებლები', icon: Sparkles },
    { id: 'top-members', label: 'ტოპ წევრები', icon: Trophy },
    { id: 'polls', label: 'გამოკითხვა', icon: BarChart3 },
  ];

  const communityItems = [
    { id: 'groups', label: t.groups || 'ჯგუფები', icon: UsersRound },
    { id: 'saved', label: 'შენახული', icon: Bookmark },
    { id: 'friends-list', label: t.friends || 'მეგობრები', icon: Users },
    { id: 'forums', label: t.forums || 'ფორუმები', icon: MessageSquare },
  ];

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
    } else {
      await signOut();
    }
  };

  const handleClick = (id: string) => {
    const targetTab = id === 'home' ? 'feed' : id;
    const isActive = activeTab === id || (id === 'home' && activeTab === 'feed');
    
    if (isActive) {
      window.location.reload();
    } else {
      onTabChange(targetTab);
    }
  };

  const NavItem = ({ item }: { item: { id: string; label: string; icon: any } }) => {
    const isActive = activeTab === item.id || (item.id === 'home' && activeTab === 'feed');
    const Icon = item.icon;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleClick(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-300 group relative",
              isActive 
                ? "bg-primary/12 text-primary" 
                : "hover:bg-secondary/60 text-foreground/70 hover:text-foreground"
            )}
          >
            {/* Active indicator pill */}
            <div className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300",
              isActive 
                ? "h-5 bg-primary" 
                : "h-0 bg-primary"
            )} />
            
            {/* Icon container — Material You tonal */}
            <div className={cn(
              "w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary/50 group-hover:bg-secondary text-muted-foreground group-hover:text-foreground"
            )}>
              <Icon className="w-[18px] h-[18px]" />
            </div>
            
            {/* Label */}
            <span className={cn(
              "text-sm font-medium transition-colors duration-200",
              isActive ? "text-primary font-semibold" : ""
            )}>
              {item.label}
            </span>

            {/* Hover tonal surface */}
            <div className={cn(
              "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
              "bg-secondary/30",
              "group-hover:opacity-100"
            )} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const NavSection = ({ 
    title, 
    items, 
    sectionKey 
  }: { 
    title: string; 
    items: typeof mainNavItems;
    sectionKey: keyof typeof openSections;
  }) => (
    <Collapsible open={openSections[sectionKey]} onOpenChange={() => toggleSection(sectionKey)}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold hover:text-foreground transition-colors group">
        <span>{title}</span>
        <div className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200",
          "bg-secondary/30 group-hover:bg-secondary/60"
        )}>
          {openSections[sectionKey] ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pt-1">
        {items.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[260px] h-screen sticky top-0 flex flex-col border-r border-border/10 bg-card/95">
        {/* Logo Header */}
        <div className="h-[56px] px-4 flex items-center border-b border-border/10">
          <button 
            onClick={() => handleClick('home')}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-online rounded-full border-2 border-card" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight">
                <span className="text-foreground">Chat</span>
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Sev</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">სოციალური ქსელი</span>
            </div>
          </button>
        </div>

        {/* User Quick Profile */}
        {profile && (
          <div className="px-3 py-3 border-b border-border/10">
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => onTabChange('profile')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-all duration-300 group border border-border/5 hover:border-border/15"
                >
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                      {profile.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{profile.username}</p>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="text-[11px] font-medium text-amber-500">{userPoints} ქულა</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">პროფილის ნახვა</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin desktop-scroll">
          <NavSection title="ნავიგაცია" items={mainNavItems} sectionKey="main" />
          <NavSection title="გართობა" items={entertainmentItems} sectionKey="entertainment" />
          <NavSection title="ერთობა" items={communityItems} sectionKey="community" />
          
          {isAdmin && (
            <NavSection 
              title="ადმინისტრაცია" 
              items={[{ id: 'admin', label: t.admin || 'ადმინ პანელი', icon: Shield }]} 
              sectionKey="admin" 
            />
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-border/10 space-y-2">
          {/* Settings */}
          <NavItem item={{ id: 'settings', label: t.settings || 'პარამეტრები', icon: Settings }} />
          
          {/* Create Post Button - Premium Gradient */}
          <button
            onClick={onCreatePost}
            className="w-full py-2.5 px-4 rounded-2xl font-semibold text-sm transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t.newPost || 'ახალი პოსტი'}
          </button>


          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-300 group"
              >
                <div className="w-9 h-9 rounded-2xl bg-destructive/10 group-hover:bg-destructive/20 flex items-center justify-center transition-all">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{t.logout || 'გასვლა'}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">გასვლა</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default DesktopSidebarNew;
