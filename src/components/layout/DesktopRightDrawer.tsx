import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Settings, Star, Archive, LogOut,
  Shield, User, Bookmark, Image, Bell, 
  Globe, Palette, ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Profile } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import AIChatSevButton from '@/components/ai/AIChatSevButton';

interface DesktopRightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: Profile | null;
  onSignOut?: () => void;
  onNavigate?: (page: string) => void;
}

const DesktopRightDrawer = ({ isOpen, onClose, profile, onSignOut, onNavigate }: DesktopRightDrawerProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleMenuClick = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
    onClose();
  };

  const handleSignOut = async () => {
    if (onSignOut) {
      await onSignOut();
    } else {
      await signOut();
    }
    navigate('/auth');
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'მამრობითი';
      case 'female': return 'მდედრობითი';
      default: return 'სხვა';
    }
  };
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset scroll position on every open
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="hidden lg:block fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside 
        className={cn(
          "hidden lg:flex fixed top-0 right-0 h-full w-[360px] bg-card z-50 flex-col",
          "transform transition-transform duration-300 ease-out shadow-2xl border-l border-border",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border h-14 flex-shrink-0">
          <h2 className="font-semibold text-lg">პროფილი და პარამეტრები</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div 
            className="flex items-center gap-4 p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl cursor-pointer hover:from-primary/10 hover:to-accent/10 transition-all duration-200"
            onClick={() => handleMenuClick('profile')}
          >
            <Avatar className="w-16 h-16 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.username} className="object-cover" />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                {profile?.username?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate text-lg">{profile?.username || 'მომხმარებელი'}</h3>
              <p className="text-sm text-muted-foreground">
                {profile ? `${profile.age} წლის • ${getGenderLabel(profile.gender)}` : ''}
              </p>
              <p className="text-xs text-primary mt-1">პროფილის ნახვა →</p>
            </div>
          </div>
        </div>

        {/* Menu Items - Scrollable with isolated scroll */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 scrollbar-thin"
          style={{ overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* AI ChatSev - First */}
          <div className="mb-4">
            <AIChatSevButton variant="compact" />
          </div>

          {/* Admin - Right after AI Chat for quick access */}
          {isAdmin && (
            <>
              <div className="space-y-1 bg-primary/5 rounded-lg p-2 -mx-2 mb-3">
                <SectionLabel>🛡️ ადმინისტრაცია</SectionLabel>
                <MenuItem 
                  icon={Shield} 
                  label={t.administration || 'ადმინ პანელი'}
                  onClick={() => handleMenuClick('admin')} 
                />
              </div>
            </>
          )}

          {/* ფუნქციები - First */}
          <div className="space-y-1">
            <SectionLabel>ფუნქციები</SectionLabel>
            <MenuItem 
              icon={User} 
              label="ჩემი პროფილი" 
              onClick={() => handleMenuClick('profile')} 
            />
            <MenuItem 
              icon={Star} 
              label="აქტივობის ქულები" 
              onClick={() => handleMenuClick('activity-points')} 
            />
            <MenuItem 
              icon={Bookmark} 
              label={t.savedItems || 'შენახული'}
              onClick={() => handleMenuClick('saved')} 
            />
            <MenuItem 
              icon={Image} 
              label={t.photos || 'ფოტოები'}
              onClick={() => handleMenuClick('photos')} 
            />
          </div>

          <div className="my-3 border-t border-border" />

          {/* გარეგნობა - Second */}
          <div className="space-y-1">
            <SectionLabel>გარეგნობა</SectionLabel>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm">ენა</span>
              </div>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm">თემა</span>
              </div>
              <ThemeSwitcher />
            </div>
          </div>

          <div className="my-3 border-t border-border" />

          {/* კონფიდენციალურობა - Third */}
          <div className="space-y-1">
            <SectionLabel>კონფიდენციალურობა</SectionLabel>
            <MenuItem 
              icon={Settings} 
              label={t.accountSettings || 'პარამეტრები'}
              onClick={() => handleMenuClick('settings')} 
            />
            <MenuItem 
              icon={Bell} 
              label="შეტყობინებები"
              onClick={() => handleMenuClick('settings')} 
            />
          </div>
        </div>

        {/* Logout - Fixed at bottom */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-sm font-medium">{t.logout || 'გასვლა'}</span>
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">ChatSev @ 2026</p>
        </div>
      </aside>
    </>
  );
};

// Section Label
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
    {children}
  </p>
);

// Helper component for menu items
const MenuItem = ({ 
  icon: Icon, 
  label, 
  onClick,
  badge
}: { 
  icon: any; 
  label: string; 
  onClick: () => void;
  badge?: number;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors group"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);

export default DesktopRightDrawer;
