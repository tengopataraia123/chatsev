import { memo } from 'react';
import { cn } from '@/lib/utils';

interface ChatSevLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

const ChatSevLogo = memo(({ size = 32, className, showText = false, textClassName }: ChatSevLogoProps) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Modern Social/Dating Style Logo - Chat bubble with heart */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Heart shape only */}
        <path
          d="M50 88 C50 88, 10 62, 10 35 C10 22, 20 12, 30 12 C37 12, 44 17, 50 25 C56 17, 63 12, 70 12 C80 12, 90 22, 90 35 C90 62, 50 88, 50 88Z"
          fill="currentColor"
          className="text-logo"
        />
      </svg>

      {/* Single color text */}
      {showText && (
        <span className={cn("font-extrabold tracking-tight select-none text-logo italic uppercase", textClassName)}>
          CHATSEV
        </span>
      )}
    </div>
  );
});

ChatSevLogo.displayName = 'ChatSevLogo';

export default ChatSevLogo;
