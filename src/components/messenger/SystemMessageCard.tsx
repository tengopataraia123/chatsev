import { memo } from 'react';
import { Radio, Pin, Trash2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { SystemMessageDelivery } from '@/hooks/useSystemMessages';

interface SystemMessageCardProps {
  delivery: SystemMessageDelivery;
  onClick: () => void;
  isActive?: boolean;
  compact?: boolean;
}

const SystemMessageCard = memo(({ 
  delivery, 
  onClick, 
  isActive = false,
  compact = false 
}: SystemMessageCardProps) => {
  const message = delivery.message;
  const isUnread = !delivery.opened_at;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer transition-all duration-200",
        "hover:bg-secondary/50 rounded-lg border",
        isActive && "bg-secondary/70 border-primary/50",
        isUnread && "bg-amber-500/5 border-amber-500/30",
        delivery.pinned && "border-l-4 border-l-amber-500"
      )}
    >
      {/* System Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
          <Radio className="w-6 h-6 text-white" />
        </div>
        {delivery.pinned && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
            <Pin className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">სისტემა</span>
          <Badge 
            variant="secondary" 
            className="text-[9px] px-1 py-0 h-4 bg-amber-500/20 text-amber-600 border-amber-500/30"
          >
            SYSTEM
          </Badge>
          {isUnread && (
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {message.title && !compact && (
          <h4 className="font-medium text-xs text-amber-600 dark:text-amber-400 truncate mb-0.5">
            {message.title}
          </h4>
        )}
        
        <p className={cn(
          "text-sm text-muted-foreground truncate",
          isUnread && "text-foreground font-medium"
        )}>
          {message.title || message.body}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(message.sent_at || message.created_at), {
              addSuffix: true,
              locale: ka
            })}
          </span>
          {message.attachments?.length > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              📎 {message.attachments.length}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

SystemMessageCard.displayName = 'SystemMessageCard';

export default SystemMessageCard;
