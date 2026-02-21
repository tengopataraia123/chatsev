import { memo, useState } from 'react';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface PinnedMessageData {
  id: string;
  content: string | null;
  image_url: string | null;
  pinned_at: string;
  pinned_by: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  pinner_profile?: {
    username: string;
  };
}

interface PinnedMessageProps {
  message: PinnedMessageData | null;
  isAdmin: boolean;
  onUnpin: (messageId: string) => void;
  onScrollTo: (messageId: string) => void;
}

const PinnedMessage = memo(({ message, isAdmin, onUnpin, onScrollTo }: PinnedMessageProps) => {
  const [expanded, setExpanded] = useState(true);

  if (!message) return null;

  return (
    <div className="border-b border-border bg-amber-500/5 dark:bg-amber-500/10">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-500/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 rotate-45" />
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex-1 truncate">
          ჩამაგრებული შეტყობინება
        </span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 flex items-start gap-2">
          <Avatar className="w-6 h-6 flex-shrink-0">
            <AvatarImage src={message.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[9px] bg-gradient-to-br from-primary to-accent text-white">
              {message.profile?.username?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{message.profile?.username || 'Unknown'}</span>
            </div>
            <button
              onClick={() => onScrollTo(message.id)}
              className="text-xs text-foreground/80 text-left hover:text-primary transition-colors whitespace-pre-wrap break-words"
            >
              {message.content || (message.image_url ? '📷 ფოტო' : '...')}
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(message.id);
              }}
              className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              title="ჩამაგრების მოხსნა"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

PinnedMessage.displayName = 'PinnedMessage';

export default PinnedMessage;
