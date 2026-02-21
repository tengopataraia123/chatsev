import { memo, useState } from 'react';
import { Bot, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AIChatbot from './AIChatbot';

interface AIChatSevButtonProps {
  variant?: 'sidebar' | 'compact';
}

const AIChatSevButton = memo(({ variant = 'sidebar' }: AIChatSevButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200",
            "bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20",
            "border border-primary/20 hover:border-primary/30",
            "group"
          )}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold truncate">AI ChatSev</p>
            <p className="text-[10px] text-muted-foreground">24/7 ასისტენტი</p>
          </div>
          <Bot className="w-4 h-4 text-primary group-hover:animate-pulse" />
        </button>
        
        <AIChatbot isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          "bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5",
          "border border-primary/20 hover:border-primary/40",
          "p-4 w-full group hover:shadow-lg hover:shadow-primary/10"
        )}
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-colors" />
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          {/* Logo */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center animate-pulse">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          
          {/* Text */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-foreground text-sm">AI ChatSev</h4>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-500 uppercase">
                Online
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              დახმარება 24/7 • უფასო
            </p>
          </div>
          
          <Bot className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
      
      <AIChatbot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
});

AIChatSevButton.displayName = 'AIChatSevButton';

export default AIChatSevButton;
