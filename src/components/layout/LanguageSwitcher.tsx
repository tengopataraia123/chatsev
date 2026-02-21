import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
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

const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'ge', label: 'ქართული', flag: '🇬🇪' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
];

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    const selected = LANGUAGE_OPTIONS.find(l => l.value === lang);
    toast({ title: `ენა შეიცვალა: ${selected?.label}` });
  };

  const currentLang = LANGUAGE_OPTIONS.find(l => l.value === language);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 hover:bg-secondary rounded-full transition-colors">
              <Globe className="w-5 h-5 text-muted-foreground" />
              {/* Small badge showing current language */}
              <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded px-1">
                {language.toUpperCase()}
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>ენა</p>
        </TooltipContent>
      </Tooltip>
      
      <DropdownMenuContent align="end" className="w-44 bg-popover border border-border">
        {LANGUAGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleLanguageChange(option.value)}
            className={`flex items-center gap-3 cursor-pointer ${
              language === option.value ? 'bg-primary/20' : ''
            }`}
          >
            <span className="text-lg">{option.flag}</span>
            <span className="flex-1">{option.label}</span>
            {language === option.value && (
              <span className="text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
