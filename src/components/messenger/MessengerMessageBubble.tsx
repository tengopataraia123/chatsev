import { memo, useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { MessengerMessage, EDIT_TIME_LIMIT_MINUTES, DELETE_TIME_LIMIT_MINUTES, ChatTheme, CHAT_THEME_COLORS } from './types';
import LinkifyText from '@/components/shared/LinkifyText';
import BubbleMediaContent from './bubble/BubbleMediaContent';
import BubbleActionBar from './bubble/BubbleActionBar';
import FullscreenImageViewer from './bubble/FullscreenImageViewer';
import { CHEGE_USER_ID } from '@/utils/rootUtils';

// Parse content and extract inline GIFs
const parseContentWithGifs = (content: string | null): { type: 'text' | 'gif'; value: string }[] => {
  if (!content) return [];
  
  const gifRegex = /\[GIF:(https?:\/\/[^\]]+)\]/g;
  const segments: { type: 'text' | 'gif'; value: string }[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = gifRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) segments.push({ type: 'text', value: text });
    }
    segments.push({ type: 'gif', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) segments.push({ type: 'text', value: text });
  }
  
  return segments.length > 0 ? segments : [{ type: 'text', value: content }];
};

interface MessengerMessageBubbleProps {
  message: MessengerMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  theme: ChatTheme;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: (forEveryone: boolean) => void;
  onDeleteForMe?: () => void;
  onCopyText?: () => void;
  onReport?: () => void;
  currentUserId: string;
}

const MessengerMessageBubble = memo(({
  message,
  isOwn,
  showAvatar = true,
  theme,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onDeleteForMe,
  currentUserId
}: MessengerMessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ urls: string[]; index: number } | null>(null);

  const hasMediaContent = !!(message.image_urls?.length || message.video_url || message.voice_url || message.gif_id);
  const canEdit = isOwn && !hasMediaContent && differenceInMinutes(new Date(), new Date(message.created_at)) <= EDIT_TIME_LIMIT_MINUTES;
  const canDeleteForEveryone = isOwn && differenceInMinutes(new Date(), new Date(message.created_at)) <= DELETE_TIME_LIMIT_MINUTES;
  const isDeleted = message.is_deleted;
  const isLiked = !!message.reactions?.find(r => r.user_id === currentUserId);

  const handleConfirmDelete = (forEveryone: boolean) => {
    if (forEveryone) {
      onDelete?.(true);
    } else {
      onDeleteForMe?.();
    }
    setShowDeleteDialog(false);
  };

  const StatusIcon = () => {
    if (!isOwn) return null;
    if (message.status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-primary" />;
    if (message.status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  if (isDeleted) {
    // CHEGE sees deleted messages with original content + red indicator
    const isChegeViewer = currentUserId === CHEGE_USER_ID;
    const hasContent = !!(message.content || message.image_urls?.length || message.video_url || message.voice_url || message.gif_id);
    
    if (isChegeViewer && hasContent) {
      // Don't return early - render normally below with deleted indicator
    } else {
      return (
        <div style={{ display: 'flex', width: '100%', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
          <div className="px-3 py-1.5 rounded-lg text-sm italic bg-muted/50 text-muted-foreground">
            {message.deleted_for_everyone ? 'შეტყობინება წაიშალა' : 'შეტყობინება წაიშალა თქვენთვის'}
          </div>
        </div>
      );
    }
  }

  // Check if this is a deleted message being shown to CHEGE
  const showDeletedIndicator = isDeleted && currentUserId === CHEGE_USER_ID;

  return (
    <>
      <div style={{ display: 'flex', width: '100%', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
        <div
          className="group"
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 'fit-content',
            maxWidth: '75%',
            alignItems: isOwn ? 'flex-end' : 'flex-start',
          }}
        >
          {/* Reply preview */}
          {message.reply_to && (
            <div className={cn(
              "text-[10px] px-2.5 py-1 rounded-t-lg mb-0 border-l-2 w-full",
              isOwn ? "bg-primary/10 border-primary/40" : "bg-muted/60 border-muted-foreground/30"
            )}>
              <span className="font-semibold text-primary/80">{message.reply_to.sender?.username}</span>
              <p className="truncate text-muted-foreground">{message.reply_to.content || '📷 მედია'}</p>
            </div>
          )}

          {/* Main bubble */}
          <div
            className={cn(
              "relative text-foreground",
              isOwn 
                ? "bg-chat-message-own/20 rounded-2xl rounded-tr-sm" 
                : "bg-muted/50 rounded-2xl rounded-tl-sm",
              hasMediaContent && !message.content ? "p-1" : "px-3 py-1.5",
              showDeletedIndicator && "border border-destructive/40"
            )}
            style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
          >
            {/* Deleted indicator for CHEGE */}
            {showDeletedIndicator && (
              <div className="text-destructive text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive" />
                წაშლილი
              </div>
            )}
            <BubbleMediaContent
              message={message}
              hasContent={!!message.content}
              onImageClick={(urls, idx) => setFullscreenImage({ urls, index: idx })}
            />

            {/* Text content with inline time */}
            {message.content ? (
              <div className="text-[14px] whitespace-pre-wrap leading-snug" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {parseContentWithGifs(message.content).map((segment, idx) => (
                  segment.type === 'gif' ? (
                    <img 
                      key={idx}
                      src={segment.value} 
                      alt="GIF" 
                      className="inline-block max-w-[60px] max-h-[60px] rounded align-middle mx-0.5"
                    />
                  ) : (
                    <LinkifyText key={idx} text={segment.value} />
                  )
                ))}
                {message.is_edited && (
                  <span className="text-[9px] opacity-50 ml-1">(რედ.)</span>
                )}
                <span className="inline-flex items-center gap-0.5 float-right ml-2 mt-0.5 relative top-[2px]">
                  <span className="text-[10px] text-muted-foreground/60 leading-none">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </span>
                  {isOwn && <StatusIcon />}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 justify-end mt-0.5 px-1">
                <span className="text-[10px] text-muted-foreground/60 leading-none">
                  {format(new Date(message.created_at), 'HH:mm')}
                </span>
                {isOwn && <StatusIcon />}
              </div>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={cn(
              "flex gap-0.5 -mt-1.5 relative z-10",
              isOwn ? "mr-1" : "ml-1"
            )}>
              {Object.entries(
                message.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="bg-background border border-border rounded-full px-1 py-0 text-[10px] shadow-sm"
                >
                  {emoji}{count > 1 && count}
                </span>
              ))}
            </div>
          )}

          {/* Action bar */}
          <BubbleActionBar
            isOwn={isOwn}
            isLiked={isLiked}
            showReactions={showReactions}
            setShowReactions={setShowReactions}
            canEdit={canEdit}
            messageId={message.id}
            senderId={message.sender_id}
            contentPreview={message.content || undefined}
            onReact={onReact}
            onReply={onReply}
            onEdit={onEdit}
            onDeleteClick={() => setShowDeleteDialog(true)}
          />
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>შეტყობინების წაშლა</AlertDialogTitle>
            <AlertDialogDescription>აირჩიეთ წაშლის ტიპი</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmDelete(false)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              წაშლა ჩემთვის
            </AlertDialogAction>
            {canDeleteForEveryone && (
              <AlertDialogAction
                onClick={() => handleConfirmDelete(true)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                წაშლა ყველასთვის
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <FullscreenImageViewer
          urls={fullscreenImage.urls}
          index={fullscreenImage.index}
          onClose={() => setFullscreenImage(null)}
          onNavigate={(newIndex) => setFullscreenImage(prev => prev ? { ...prev, index: newIndex } : null)}
        />
      )}
    </>
  );
});

MessengerMessageBubble.displayName = 'MessengerMessageBubble';

export default MessengerMessageBubble;
