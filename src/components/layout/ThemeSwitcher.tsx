import { useState, useEffect } from 'react';
import { Moon, Sun, Paintbrush } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ThemeOption = 'dark' | 'light' | 'facebook' | 'yellow';

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ReactNode; gradient: string }[] = [
  { 
    value: 'dark', 
    label: 'მუქი', 
    icon: <Moon className="w-4 h-4" />,
    gradient: 'from-slate-800 to-indigo-900'
  },
  { 
    value: 'light', 
    label: 'ნათელი', 
    icon: <Sun className="w-4 h-4" />,
    gradient: 'from-sky-100 to-amber-100'
  },
  { 
    value: 'facebook', 
    label: 'Facebook', 
    icon: <span className="text-sm font-bold leading-none">f</span>,
    gradient: 'from-blue-500 to-blue-700'
  },
  { 
    value: 'yellow', 
    label: 'Yellow', 
    icon: <Sun className="w-4 h-4" />,
    gradient: 'from-amber-300 to-orange-400'
  },
];

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

const ThemeSwitcher = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>('facebook');

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
          applyTheme(data.theme as ThemeOption);
          localStorage.setItem('app-theme', data.theme);
          return;
        }
      }
      
      const savedTheme = localStorage.getItem('app-theme') as ThemeOption;
      if (savedTheme) {
        setCurrentTheme(savedTheme);
        applyTheme(savedTheme);
      } else {
        setCurrentTheme('facebook');
        applyTheme('facebook');
      }
    };
    
    loadTheme();
  }, [user?.id]);

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
    
    toast({ title: 'თემა შეიცვალა', duration: 1500 });
  };

  const currentOption = THEME_OPTIONS.find(t => t.value === currentTheme);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button className="relative p-1.5 hover:bg-secondary/80 rounded-lg transition-all duration-200 active:scale-95 group">
              {/* Animated theme preview dot */}
              <div className="relative">
                <Paintbrush className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <div 
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-gradient-to-br transition-all duration-300",
                    currentOption?.gradient
                  )} 
                />
              </div>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>თემა</p>
        </TooltipContent>
      </Tooltip>
      
      <DropdownMenuContent align="end" className="w-52 p-1.5 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl">
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleThemeChange(option.value)}
            className={cn(
              "flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-200",
              currentTheme === option.value 
                ? 'bg-primary/15 text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {/* Theme color preview */}
            <div className={cn(
              "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm transition-transform duration-200",
              option.gradient,
              currentTheme === option.value && "scale-110 shadow-md"
            )}>
              {option.icon}
            </div>
            <span className="flex-1 font-medium text-sm">{option.label}</span>
            {currentTheme === option.value && (
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
