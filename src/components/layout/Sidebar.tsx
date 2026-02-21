import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Star, Archive, Shield, LogOut, User,
  Image, Users, UsersRound, Bookmark, X, MessageSquare, Music,
  HelpCircle, BarChart3, ShoppingBag, FileText, Newspaper, Heart,
  Gamepad2, Store, Video, Moon, Globe, MonitorSmartphone,
  Clapperboard, Film, Sparkles, Lightbulb,
  MapPin, Clock, Briefcase, ListMusic, Ghost, Dumbbell, Smile,
  MessageCircleQuestion, Wand2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n';
import { Profile } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AIChatSevButton from '@/components/ai/AIChatSevButton';
import { SiteRulesDialog } from '@/components/dialogs/SiteRulesDialog';
import { PrivacyPolicyDialog } from '@/components/dialogs/PrivacyPolicyDialog';
import { ContactDialog } from '@/components/dialogs/ContactDialog';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: Profile | null;
  onSignOut?: () => void;
  onNavigate?: (page: string) => void;
}

type ThemeOption = 'dark' | 'light' | 'facebook' | 'yellow';

const THEME_LABELS: Record<ThemeOption, string> = {
  dark: 'მუქი',
  light: 'ნათელი',
  facebook: 'Facebook Style',
  yellow: 'Yellow',
};

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'ge', label: 'ქართული' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

const Sidebar = ({ isOpen, onClose, profile, onSignOut, onNavigate }: SidebarProps) => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { isAdmin, user, signOutAllDevices, userRole } = useAuth();
  const { toast } = useToast();
  const sidebarRef = useRef<HTMLElement>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>('dark');
  const [localIsAdmin, setLocalIsAdmin] = useState(isAdmin);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);

  // Double-check admin status from DB to handle race condition
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setLocalIsAdmin(false);
        return;
      }
      
      // First use context value
      if (isAdmin) {
        setLocalIsAdmin(true);
        return;
      }
      
      // If context says not admin, double-check from DB
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const role = data?.role;
        const isActuallyAdmin = role === 'super_admin' || role === 'admin' || role === 'moderator';
        setLocalIsAdmin(isActuallyAdmin);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setLocalIsAdmin(isAdmin);
      }
    };
    
    checkAdminStatus();
  }, [user?.id, isAdmin]);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('user_id', user.id)
          .single();
        
        if (data?.theme) {
          setCurrentTheme(data.theme as ThemeOption);
          return;
        }
      }
      
      const savedTheme = localStorage.getItem('app-theme') as ThemeOption;
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    };
    
    loadTheme();
  }, [user?.id]);

  // Reset scroll position on every open
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      sidebarRef.current.scrollTop = 0;
    }
  }, [isOpen]);


  const applyTheme = (theme: ThemeOption) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-facebook', 'theme-yellow');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'facebook') {
      root.classList.add('theme-facebook');
    } else if (theme === 'yellow') {
      root.classList.add('theme-yellow');
    }
  };

  const handleThemeChange = async (theme: ThemeOption) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem('app-theme', theme);
    
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ theme })
        .eq('user_id', user.id);
    }
    
    toast({ title: 'თემა შეიცვალა' });
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    toast({ title: `ენა შეიცვალა` });
  };

  const mainMenuItems = [
    { icon: User, label: 'პროფილის ინფორმაცია', action: 'my-profile-info' },
    { icon: Star, label: 'აქტივობის ქულები', action: 'activity-points' },
  ];

  const featuresMenuItems = [
    { icon: UsersRound, label: t.groupChat, action: 'group-chat', highlight: true },
    { icon: Image, label: 'ფოტოგალერია', action: 'photos', highlight: true },
    { icon: Users, label: t.users, action: 'all-users' },
    { icon: Image, label: 'ჩემი ფოტოები', action: 'my-photos' },
    
    { icon: Video, label: t.videos, action: 'videos', highlight: true },
    { icon: Clapperboard, label: 'ფილმები', action: 'movies', highlight: true },
    { icon: Music, label: t.music, action: 'music' },
    { icon: UsersRound, label: t.groups, action: 'groups' },
    { icon: MessageSquare, label: t.forums, action: 'forums' },
    { icon: FileText, label: t.pages, action: 'pages' },
    { icon: Newspaper, label: t.blogs, action: 'blogs', highlight: true },
    { icon: HelpCircle, label: t.quizzes, action: 'quizzes' },
    { icon: BarChart3, label: t.polls, action: 'polls' },
    { icon: ShoppingBag, label: t.marketplace, action: 'marketplace' },
    { icon: Bookmark, label: t.savedItems, action: 'saved' },
    { icon: Store, label: t.shop, action: 'shop', highlight: true },
    { icon: Gamepad2, label: t.games, action: 'games', highlight: true },
  ];

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return t.male;
      case 'female': return t.female;
      default: return t.other;
    }
  };

  const handleMenuClick = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
    onClose();
  };

  const handleSignOut = async () => {
    if (onSignOut) {
      await onSignOut();
      navigate('/auth');
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      await signOutAllDevices();
      toast({ title: 'ყველა მოწყობილობიდან გამოხვედით' });
      navigate('/auth');
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  return (
    <>
      {/* Backdrop - Mobile only */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[59] lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - Mobile only, hidden on desktop */}
      <aside ref={sidebarRef} className={`
        fixed top-0 right-0 h-full w-80 bg-sidebar z-[60] transform transition-transform duration-300 ease-in-out lg:hidden
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        overflow-y-auto scrollbar-hide
      `}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {profile?.username?.charAt(0).toUpperCase() || 'M'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{profile?.username || 'MetaUser'}</h3>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[hsl(142,70%,45%)]"></span>
                  {profile ? `${profile.age} ${t.yearsOld} • ${getGenderLabel(profile.gender)}` : t.online}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-2">
          {/* App Download Section */}
          <div className="mb-3">
            <p className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">აპლიკაციის ჩამოტვირთვა</p>
            <div className="flex gap-2 px-3">
              <button
                onClick={() => navigate('/install')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl transition-all duration-200 group"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-white text-sm font-medium">iOS</span>
              </button>
              <button
                onClick={() => navigate('/install')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-xl transition-all duration-200 group"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M17.523 15.341c-.5-.274-1.052-.513-1.666-.717l-.37-.145c-.306-.12-.639-.199-.995-.242a8.44 8.44 0 01-.476-.048c-.076-.009-.153-.02-.231-.03l-.142-.024-.11-.019a3.996 3.996 0 01-.294-.061c-.078-.019-.152-.04-.222-.065a1.656 1.656 0 01-.187-.076.798.798 0 01-.131-.074.468.468 0 01-.093-.076.316.316 0 01-.057-.073.184.184 0 01-.024-.069.128.128 0 01.006-.061.166.166 0 01.036-.058.263.263 0 01.068-.054.419.419 0 01.1-.047c.041-.012.087-.022.138-.03.051-.007.107-.011.167-.012.06-.001.125.002.193.009.068.007.14.017.215.032.076.014.156.034.24.057.084.024.172.053.266.087.093.034.191.074.295.119.104.045.213.097.328.154.115.058.237.122.364.193.127.07.26.148.398.232.139.085.283.177.433.276.15.1.305.206.466.32.16.114.327.235.498.363.171.128.348.264.53.406.181.142.368.29.559.446.19.155.387.318.587.487.2.169.405.345.614.527s.421.371.635.565c.214.193.43.393.649.599.218.206.438.417.66.635.22.217.443.44.665.668.222.228.446.461.669.7.223.24.447.483.67.732.223.25.446.504.669.762.222.259.444.522.665.79a31.96 31.96 0 01.656.808c.217.272.432.55.645.832.212.282.422.569.629.86.206.29.41.585.61.884.199.298.394.6.585.907.19.306.376.617.556.931.18.315.356.634.525.957.169.323.332.651.49.982.157.331.309.666.454 1.004.146.339.286.681.42 1.027.134.346.262.695.385 1.048.122.352.24.707.352 1.066.111.358.218.72.32 1.083.102.364.2.731.293 1.1.093.37.182.742.266 1.116.084.375.165.752.241 1.131.076.38.148.762.217 1.147.068.385.133.772.195 1.161.061.39.119.782.174 1.176.055.395.106.792.155 1.19.049.399.095.8.138 1.203.043.403.083.808.121 1.215.038.407.073.816.106 1.226.033.41.064.822.092 1.236.029.414.055.83.078 1.248.024.418.045.838.064 1.259.019.421.035.844.049 1.268.014.425.026.851.035 1.279.01.428.017.858.022 1.288.005.431.008.863.008 1.297 0 .434-.003.866-.008 1.297-.005.43-.012.86-.022 1.288-.01.428-.02.855-.035 1.28-.014.424-.03.847-.049 1.269-.019.421-.04.841-.064 1.259-.024.418-.05.834-.079 1.249-.029.414-.06.827-.093 1.237-.033.41-.068.82-.106 1.227-.038.407-.079.812-.122 1.216-.043.404-.089.806-.139 1.206-.049.4-.101.798-.156 1.194-.055.396-.113.79-.175 1.182-.062.392-.127.781-.196 1.168-.07.387-.143.771-.22 1.154-.077.382-.157.762-.24 1.14-.084.377-.171.753-.262 1.126-.091.373-.186.744-.284 1.113-.098.369-.2.736-.305 1.1-.105.364-.214.726-.326 1.086-.112.36-.228.717-.347 1.071-.119.355-.242.707-.368 1.057-.126.35-.256.697-.388 1.042-.133.345-.27.688-.409 1.027-.14.34-.283.677-.43 1.01-.147.334-.298.665-.451.993-.154.328-.312.653-.472.975-.16.322-.325.64-.492.956-.167.315-.338.628-.511.937-.174.31-.352.616-.532.919-.18.303-.364.603-.55.9-.187.296-.378.59-.57.88-.194.29-.39.578-.59.862-.2.284-.404.565-.61.843-.206.278-.416.552-.628.823-.212.271-.428.539-.646.803-.218.265-.44.526-.664.784-.224.258-.45.513-.68.764-.23.25-.462.497-.698.741-.235.243-.474.483-.715.719-.241.236-.485.469-.731.698-.247.229-.497.454-.75.676-.253.222-.509.44-.767.654-.258.215-.52.426-.783.633-.264.207-.531.41-.8.609-.27.199-.542.394-.818.585-.275.19-.553.377-.833.559-.281.182-.564.361-.85.534-.286.174-.574.344-.865.51-.29.165-.583.327-.879.484-.296.157-.594.31-.894.458-.3.149-.603.293-.908.433-.305.14-.612.275-.921.406-.309.131-.621.258-.934.38-.314.122-.629.24-.946.353-.318.113-.637.222-.958.325-.321.104-.644.203-.969.298-.325.094-.651.184-.979.269-.328.085-.658.165-.989.241-.331.076-.663.147-.997.213-.334.066-.669.128-1.005.185-.337.057-.674.109-1.014.157-.339.048-.679.091-1.021.129-.341.038-.684.072-1.027.101-.344.029-.689.053-1.035.072-.346.02-.693.034-1.04.044-.348.01-.696.015-1.046.015-.349 0-.697-.005-1.046-.015-.347-.01-.694-.025-1.04-.044-.347-.019-.692-.043-1.036-.072-.343-.029-.686-.063-1.028-.101-.341-.039-.682-.082-1.02-.13-.339-.047-.677-.1-1.014-.157-.336-.057-.671-.119-1.005-.185-.334-.066-.667-.137-.998-.213-.331-.076-.661-.156-.989-.241-.328-.085-.654-.175-.979-.269-.325-.094-.648-.194-.969-.298-.321-.104-.64-.213-.958-.326-.318-.113-.632-.231-.946-.353-.313-.123-.625-.249-.935-.38-.309-.131-.617-.267-.922-.408-.304-.14-.607-.284-.907-.433-.3-.148-.597-.301-.893-.459-.295-.157-.588-.319-.879-.485-.29-.166-.578-.336-.864-.51-.286-.174-.569-.353-.85-.536-.28-.182-.558-.369-.833-.559-.275-.191-.548-.386-.818-.586-.269-.2-.536-.403-.8-.61-.264-.208-.525-.419-.784-.634-.258-.215-.513-.434-.766-.656-.253-.222-.503-.448-.75-.677-.247-.229-.491-.462-.732-.699-.24-.236-.479-.476-.714-.72-.236-.244-.468-.492-.698-.742-.23-.251-.457-.505-.68-.763-.224-.258-.445-.52-.663-.784-.218-.265-.433-.533-.645-.804-.212-.271-.422-.546-.628-.823-.206-.278-.409-.559-.609-.844-.2-.284-.397-.571-.591-.862-.193-.29-.382-.584-.569-.881-.186-.297-.369-.597-.549-.9-.18-.303-.357-.61-.532-.92-.174-.31-.345-.623-.512-.938-.167-.316-.33-.635-.491-.957-.161-.322-.319-.647-.474-.975-.154-.328-.305-.66-.452-.993-.147-.334-.291-.671-.431-1.01-.14-.34-.277-.683-.41-1.028-.133-.345-.263-.692-.389-1.042-.126-.35-.249-.703-.368-1.058-.12-.354-.235-.712-.347-1.072-.112-.36-.221-.723-.326-1.087-.105-.364-.207-.731-.306-1.1-.098-.369-.193-.74-.284-1.113-.091-.373-.179-.749-.263-1.126-.083-.378-.163-.757-.24-1.14-.076-.382-.15-.766-.22-1.153-.069-.387-.135-.776-.197-1.167-.062-.392-.12-.786-.175-1.181-.055-.396-.107-.794-.156-1.193-.049-.4-.095-.801-.138-1.205-.043-.403-.083-.809-.121-1.216-.038-.406-.073-.815-.105-1.227-.033-.41-.063-.823-.092-1.237-.028-.414-.054-.83-.078-1.248-.023-.417-.044-.837-.063-1.258-.019-.421-.035-.844-.049-1.268-.014-.424-.025-.85-.035-1.279-.009-.428-.016-.858-.021-1.288-.005-.43-.008-.862-.008-1.296 0-.434.003-.866.008-1.297.005-.43.012-.859.022-1.288.009-.428.02-.854.035-1.279.014-.424.03-.847.049-1.268.019-.422.04-.841.063-1.259.024-.418.05-.834.078-1.248.029-.414.06-.827.092-1.236.033-.41.067-.82.106-1.226.038-.407.078-.812.121-1.215.043-.403.089-.805.138-1.204.049-.399.101-.797.156-1.192.055-.395.113-.788.175-1.18.062-.39.128-.78.196-1.166.07-.386.144-.771.22-1.153.077-.382.157-.762.24-1.139.084-.377.172-.752.263-1.125.091-.373.186-.743.284-1.113.098-.369.201-.735.305-1.1.105-.364.214-.726.327-1.086.112-.36.227-.716.347-1.071.119-.355.242-.706.368-1.056.126-.35.255-.697.388-1.042.133-.345.27-.687.409-1.027.14-.34.284-.676.431-1.01.147-.333.298-.664.452-.992.154-.328.312-.653.473-.975.16-.322.324-.64.491-.957.167-.316.337-.628.511-.938.174-.31.351-.616.531-.92.18-.303.363-.603.55-.9.186-.297.377-.59.57-.88.193-.29.39-.577.59-.861.2-.284.404-.565.61-.843.206-.278.416-.552.628-.823.212-.27.428-.538.646-.803.218-.264.439-.525.664-.783.224-.258.45-.513.68-.764.23-.25.463-.497.698-.741.235-.244.474-.483.715-.72.241-.236.484-.469.731-.698.246-.229.497-.454.75-.676.253-.222.508-.44.766-.654.258-.215.52-.426.784-.634.263-.207.531-.41.8-.609.269-.199.542-.394.817-.585.276-.191.553-.378.833-.56.28-.182.563-.36.85-.534.285-.174.573-.344.864-.51.29-.166.583-.328.879-.485.296-.157.593-.31.893-.458.3-.149.603-.293.908-.433.305-.14.612-.275.921-.406.309-.131.621-.258.934-.38.314-.123.628-.24.946-.353.318-.114.637-.222.958-.326.321-.104.644-.203.969-.297.325-.095.651-.185.979-.27.328-.085.658-.165.989-.24.331-.076.663-.147.997-.213.334-.067.669-.129 1.005-.186.337-.057.675-.11 1.014-.157.339-.048.68-.092 1.021-.13.342-.039.684-.072 1.027-.101.344-.03.689-.053 1.035-.073.347-.019.693-.034 1.041-.044.347-.01.696-.015 1.046-.015s.698.005 1.046.015c.348.01.694.025 1.04.044.347.02.692.043 1.036.072.343.03.685.063 1.027.101.342.039.682.082 1.021.13.339.048.677.1 1.014.157.336.057.671.119 1.005.185.334.067.667.138.997.213.331.076.661.156.989.241.328.085.654.175.979.269.325.095.648.194.969.298.321.104.64.212.958.326.318.113.632.23.946.353.313.122.625.249.934.38.31.131.617.267.922.407.305.14.607.284.907.433.3.148.598.301.894.458.295.157.588.319.878.485.291.166.579.336.865.51.285.174.569.352.85.534.28.182.557.369.833.56.275.19.547.386.817.585.27.199.537.403.8.61.264.207.526.419.784.633.258.215.514.433.766.655.253.222.503.447.75.676.247.229.49.462.731.698.241.237.48.476.715.72.236.244.468.491.698.741.23.25.456.506.68.764.224.258.446.52.663.784.219.264.434.532.646.803.212.27.422.545.628.823.206.277.41.558.61.842.2.284.397.572.59.862.194.29.383.583.57.88.186.297.369.597.549.9.18.304.357.61.531.92.174.31.345.622.512.937.167.316.33.635.49.957.161.322.32.647.474.975.154.328.305.66.451.993.147.333.291.67.431 1.009.14.34.276.683.41 1.028.133.345.262.693.388 1.043.126.35.248.702.368 1.056.119.355.234.712.346 1.072.112.36.221.722.326 1.086.105.364.207.731.305 1.1.099.37.194.74.285 1.113.091.373.178.749.262 1.125.084.378.163.758.24 1.14.076.383.15.766.22 1.153.069.387.134.776.196 1.167.062.391.12.785.175 1.18.055.396.107.794.156 1.193.049.399.095.8.138 1.204.043.404.083.809.121 1.216.038.406.073.815.106 1.226.032.41.063.822.092 1.237.029.414.055.83.078 1.248.024.418.045.837.064 1.259.018.42.034.844.048 1.268.014.424.026.851.035 1.279.01.429.017.858.022 1.288.005.431.008.863.008 1.297Z"/>
                </svg>
                <span className="text-white text-sm font-medium">Android</span>
              </button>
            </div>
          </div>

          {/* AI ChatSev - Prominent placement */}
          <div className="mb-3 px-3">
            <AIChatSevButton variant="compact" />
          </div>

          {/* Admin Panel Link - right after AI ChatSev */}
          {localIsAdmin && (
            <div className="mb-3 bg-primary/5 rounded-lg p-1 -mx-1 border border-primary/20">
              <button
                onClick={() => handleMenuClick('admin')}
                className="menu-item w-full text-left bg-primary/10 hover:bg-primary/20"
              >
                <div className="menu-icon bg-primary/20">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="text-primary font-medium">🛡️ {t.administration}</span>
              </button>
            </div>
          )}

          <div className="border-t border-sidebar-border my-2" />

          {/* Main Menu Items - First */}
          {mainMenuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleMenuClick(item.action)}
              className="menu-item w-full text-left"
            >
              <div className="menu-icon">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-sidebar-foreground">{item.label}</span>
            </button>
          ))}

          <div className="border-t border-sidebar-border my-2" />

          <p className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">{t.features}</p>
          {featuresMenuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleMenuClick(item.action)}
              className="menu-item w-full text-left"
            >
              <div className="menu-icon">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-sidebar-foreground">{item.label}</span>
            </button>
          ))}


          <div className="border-t border-sidebar-border my-2" />

          {/* გარეგნობა - Appearance Section */}
          <p className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">გარეგნობა</p>
          
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <span className="text-sidebar-foreground">თემა</span>
            </div>
            <Select value={currentTheme} onValueChange={(value) => handleThemeChange(value as ThemeOption)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(THEME_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-sidebar-foreground">ენა</span>
            </div>
            <Select value={language} onValueChange={(value) => handleLanguageChange(value as Language)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>



          <button
            onClick={handleSignOut}
            className="menu-item w-full text-left text-destructive hover:bg-destructive/10"
          >
            <div className="menu-icon bg-destructive/20">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <span>{t.logout}</span>
          </button>
        </div>

        <div className="p-4 text-xs text-muted-foreground border-t border-sidebar-border mt-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span 
              className="hover:text-foreground cursor-pointer"
              onClick={() => setShowPrivacyDialog(true)}
            >
              {t.privacy}
            </span>
            <span>•</span>
            <span 
              className="hover:text-foreground cursor-pointer"
              onClick={() => setShowRulesDialog(true)}
            >
              {t.rules}
            </span>
            <span>•</span>
            <span 
              className="hover:text-primary cursor-pointer font-medium text-primary/80"
              onClick={() => setShowContactDialog(true)}
            >
              დაგვიკავშირდით
            </span>
          </div>
          <p className="mt-2">ChatSev © 2026</p>
        </div>

        {/* Dialogs */}
        <SiteRulesDialog open={showRulesDialog} onOpenChange={setShowRulesDialog} onSidebarClose={onClose} />
        <PrivacyPolicyDialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog} onSidebarClose={onClose} />
        <ContactDialog open={showContactDialog} onOpenChange={setShowContactDialog} onSidebarClose={onClose} />
      </aside>
    </>
  );
};

export default Sidebar;