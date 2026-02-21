import { Heart, Reply, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_REACTIONS } from '../types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ReportButton } from '@/components/reports/ReportButton';

interface BubbleActionBarProps {
  isOwn: boolean;
  isLiked: boolean;
  showReactions: boolean;
  setShowReactions: (open: boolean) => void;
  canEdit: boolean;
  messageId: string;
  senderId: string;
  contentPreview?: string;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDeleteClick: () => void;
}

const BubbleActionBar = ({
  isOwn,
  isLiked,
  showReactions,
  setShowReactions,
  canEdit,
  messageId,
  senderId,
  contentPreview,
  onReact,
  onReply,
  onEdit,
  onDeleteClick,
}: BubbleActionBarProps) => {
  return (
    <div className={cn(
      "flex items-center gap-0 -mt-0.5 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity md:duration-200",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Heart with reactions popover */}
      <Popover open={showReactions} onOpenChange={setShowReactions}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "p-1 rounded transition-colors",
              isLiked 
                ? "text-red-500" 
                : "text-muted-foreground/60 hover:text-muted-foreground"
            )}
          >
            <Heart className={cn("w-3 h-3", isLiked && "fill-current")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5" side="top" align="start">
          <div className="flex gap-0.5">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(emoji);
                  setShowReactions(false);
                }}
                className="text-lg hover:scale-125 transition-transform p-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reply */}
      {onReply && (
        <button
          onClick={onReply}
          className="p-1 rounded text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <Reply className="w-3 h-3" />
        </button>
      )}

      {/* Edit */}
      {isOwn && canEdit && onEdit && (
        <button
          onClick={onEdit}
          className="p-1 rounded text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDeleteClick}
        className="p-1 rounded text-muted-foreground/60 hover:text-destructive transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Report */}
      {!isOwn && (
        <ReportButton
          contentType="messenger_message"
          contentId={messageId}
          reportedUserId={senderId}
          contentPreview={contentPreview}
          variant="icon"
          showOnlyForOthers={false}
          className="p-1 h-auto w-auto text-muted-foreground/60 hover:text-destructive [&_svg]:w-3 [&_svg]:h-3"
        />
      )}
    </div>
  );
};

export default BubbleActionBar;
