import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ThemeOption = 'dark' | 'light' | 'facebook' | 'yellow';

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
  // Light theme is default - no class needed
};

const ModernThemeSwitcher = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'facebook' || saved === 'yellow') return saved;
    return 'facebook';
  });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('user_id', user.id)
          .single();
        
        if (data?.theme) {
          const theme = (data.theme === 'light' || data.theme === 'dark' || data.theme === 'facebook' || data.theme === 'yellow') 
            ? data.theme as ThemeOption 
            : 'facebook';
          setCurrentTheme(theme);
          applyTheme(theme);
          localStorage.setItem('app-theme', theme);
          return;
        }
      }
      
      const savedTheme = localStorage.getItem('app-theme') as ThemeOption;
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'facebook' || savedTheme === 'yellow') {
        setCurrentTheme(savedTheme);
        applyTheme(savedTheme);
      } else {
        // Default to facebook theme
        setCurrentTheme('facebook');
        applyTheme('facebook');
      }
    };
    
    loadTheme();
  }, [user?.id]);

  const handleThemeToggle = async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    // Cycle through themes: facebook → dark → light → facebook
    const themeOrder: ThemeOption[] = ['facebook', 'dark', 'light', 'yellow'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const newTheme: ThemeOption = themeOrder[(currentIndex + 1) % themeOrder.length];
    
    // Animate transition
    document.documentElement.style.transition = 'background-color 0.4s ease, color 0.4s ease';
    
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('user_id', user.id);
    }
    
    const themeNames: Record<ThemeOption, string> = {
      dark: 'მუქი თემა',
      light: 'ნათელი თემა',
      facebook: 'Facebook თემა',
      yellow: 'Yellow თემა',
    };
    toast({ 
      title: themeNames[newTheme],
      duration: 1500
    });

    setTimeout(() => {
      document.documentElement.style.transition = '';
      setIsAnimating(false);
    }, 400);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleThemeToggle}
          disabled={isAnimating}
          className={cn(
            "relative w-14 h-7 rounded-full p-0.5 transition-all duration-300",
            "bg-gradient-to-r border border-border/30",
            currentTheme === 'dark' && "from-indigo-900/80 to-purple-900/80",
            currentTheme === 'light' && "from-sky-200 to-amber-100",
            currentTheme === 'facebook' && "from-blue-500 to-blue-700",
            currentTheme === 'yellow' && "from-amber-300 to-orange-400",
            "hover:shadow-lg hover:scale-105",
            isAnimating && "pointer-events-none"
          )}
        >
          {/* Track background */}
          <div className="absolute inset-0.5 rounded-full overflow-hidden">
            <div className={cn(
              "absolute inset-0 transition-opacity duration-300",
              currentTheme === 'dark' ? "opacity-100" : "opacity-0"
            )}>
              <div className="absolute w-1 h-1 bg-white/60 rounded-full top-1.5 left-2" />
              <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full top-3 left-4" />
              <div className="absolute w-0.5 h-0.5 bg-white/50 rounded-full top-1 right-8" />
            </div>
          </div>

          {/* Toggle knob */}
          <div
            className={cn(
              "relative w-6 h-6 rounded-full transition-all duration-300 ease-out",
              "flex items-center justify-center shadow-md",
              currentTheme === 'dark' && "translate-x-0 bg-gradient-to-br from-slate-700 to-slate-800",
              currentTheme === 'light' && "translate-x-7 bg-gradient-to-br from-amber-300 to-orange-400",
              currentTheme === 'facebook' && "translate-x-3 bg-gradient-to-br from-blue-400 to-blue-600",
              currentTheme === 'yellow' && "translate-x-7 bg-gradient-to-br from-amber-300 to-orange-400"
            )}
          >
            {currentTheme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-indigo-200" />
            ) : currentTheme === 'facebook' ? (
              <span className="text-[10px] font-bold text-white leading-none">f</span>
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-700" />
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        თემის შეცვლა
      </TooltipContent>
    </Tooltip>
  );
};

export default ModernThemeSwitcher;
