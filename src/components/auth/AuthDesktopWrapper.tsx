import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n';

interface AuthDesktopWrapperProps {
  children: ReactNode;
}

const AuthDesktopWrapper = ({ children }: AuthDesktopWrapperProps) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="hidden lg:flex min-h-screen w-full">
      {/* Left Side - Branding & Illustration */}
      <div className="w-1/2 bg-gradient-to-br from-primary/10 via-accent/5 to-background relative flex flex-col items-center justify-center p-12 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        
        {/* Content */}
        <div className="relative z-10 text-center max-w-md">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
              <svg viewBox="0 0 24 24" className="w-14 h-14 text-primary-foreground" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold mb-4"
          >
            <span className="text-foreground">Chat</span>
            <span className="text-primary">Sev</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-muted-foreground mb-8"
          >
            საქართველოს უდიდესი სოციალური ქსელი
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {['გაიცანი ახალი ადამიანები', 'გააზიარე მომენტები', 'იპოვე მეგობრები'].map((text, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {text}
              </span>
            ))}
          </motion.div>
        </div>
        
        {/* Settings on left side */}
        <div className="absolute top-6 left-6 flex gap-2">
          <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
            <SelectTrigger className="w-auto h-10 px-3 bg-card/80 backdrop-blur border-border/50 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ge">🇬🇪 ქართული</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
              <SelectItem value="ru">🇷🇺 Русский</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-10 px-2 bg-card/80 backdrop-blur border border-border/50 rounded-xl flex items-center">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center">
          <p className="text-sm text-muted-foreground">ChatSev © 2026 • ყველა უფლება დაცულია</p>
        </div>
      </div>
      
      {/* Right Side - Auth Form */}
      <div className="w-1/2 flex items-center justify-center p-12 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthDesktopWrapper;
