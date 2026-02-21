import { memo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Plus, UserX, Pencil, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageItem from './MessageItem';
import ChatColorPicker from './ChatColorPicker';


interface Message {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  gif_id: string | null;
  created_at: string;
  is_deleted: boolean;
  reply_to_id: string | null;
  is_private: boolean;
  private_to_user_id: string | null;
  is_anonymous?: boolean;
  profile?: {
    username: string;
    avatar_url: string | null;
    last_seen: string | null;
  };
  gif?: {
    id: string;
    file_original: string;
    file_preview: string | null;
    title: string;
  } | null;
  reply_to?: Message | null;
  private_to_profile?: {
    username: string;
  } | null;
}

interface MessagesPaginatedProps {
  messages: Message[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  ignoredUsers: Set<string>;
  usersWhoIgnoredMe: Set<string>;
  gracePeriodSeconds: number;
  roomType?: string;
  roomName?: string;
  onReply: (message: Message) => void;
  onDelete: (messageId: string, ownerId?: string) => void;
  onIgnore: (userId: string) => void;
  onUnignore: (userId: string) => void;
  onMute: (userId: string) => void;
  onBan: (userId: string) => void;
  onSiteBan?: (userId: string) => void;
  onEdit: (message: Message) => void;
  onNavigateToProfile?: (userId: string) => void;
  onNicknameClick?: (username: string) => void;
  onImageClick: (url: string) => void;
  onPrivateMessage: (message: Message) => void;
  onPin?: (messageId: string) => void;
  onThread?: (message: Message) => void;
  highlightedId: string | null;
  userStatuses: Map<string, any>;
  chatBackgroundColor?: string;
  onClearRoom?: () => void;
  onAddTopic?: (() => void) | null;
  // New props for bottom controls
  onShowIgnoreList?: () => void;
  ignoredCount?: number;
  onColorChange?: (color: string) => void;
  chatColor?: string;
  onEditTopic?: () => void;
  onDeleteTopic?: () => void;
}

const MESSAGES_PER_PAGE = 30;

const MessagesPaginated = memo(({
  messages,
  currentPage,
  totalPages,
  onPageChange,
  currentUserId,
  currentUsername,
  isAdmin,
  isSuperAdmin,
  ignoredUsers,
  usersWhoIgnoredMe,
  gracePeriodSeconds,
  roomType,
  roomName,
  onReply,
  onDelete,
  onIgnore,
  onUnignore,
  onMute,
  onBan,
  onSiteBan,
  onEdit,
  onNavigateToProfile,
  onNicknameClick,
  onImageClick,
  onPrivateMessage,
  onPin,
  onThread,
  highlightedId,
  userStatuses,
  chatBackgroundColor,
  onClearRoom,
  onAddTopic,
  onShowIgnoreList,
  ignoredCount = 0,
  onColorChange,
  chatColor,
  onEditTopic,
  onDeleteTopic
}: MessagesPaginatedProps) => {
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter messages - mutual ignore logic (super admins see everything)
  const filteredMessages = messages.filter(message => {
    // Super admins see all messages including private ones
    if (isSuperAdmin) {
      return true;
    }
    
    // Mutual ignore: if I ignored them OR they ignored me, don't show their messages
    const isMessageFromIgnoredUser = ignoredUsers.has(message.user_id) && message.user_id !== currentUserId;
    const isMessageFromUserWhoIgnoredMe = usersWhoIgnoredMe.has(message.user_id) && message.user_id !== currentUserId;
    
    if (isMessageFromIgnoredUser || isMessageFromUserWhoIgnoredMe) {
      return false;
    }
    
    // Filter private messages - only show to sender and recipient
    if (message.is_private) {
      const isSender = message.user_id === currentUserId;
      const isRecipient = message.private_to_user_id === currentUserId;
      return isSender || isRecipient;
    }
    
    return true;
  });

  // Paginate
  const startIndex = (currentPage - 1) * MESSAGES_PER_PAGE;
  const endIndex = startIndex + MESSAGES_PER_PAGE;
  const pageMessages = filteredMessages.slice(startIndex, endIndex);

  const handleReplyClick = useCallback((replyToId: string) => {
    const replyRef = messageRefs.current.get(replyToId);
    if (replyRef) {
      replyRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
        <p className="text-sm">ჯერ არ არის შეტყობინებები</p>
        <p className="text-xs">იყავი პირველი!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {/* Messages */}
      <div className="mx-auto w-full max-w-[680px] px-3 sm:px-4 py-2 space-y-[6px]">
        {pageMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            ref={(el) => {
              if (el) messageRefs.current.set(message.id, el);
            }}
            isOwn={message.user_id === currentUserId}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            isIgnored={ignoredUsers.has(message.user_id)}
            isHighlighted={highlightedId === message.id}
            userStatus={userStatuses.get(message.user_id)}
            gracePeriodSeconds={gracePeriodSeconds}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            roomType={roomType}
            roomName={roomName}
            onReply={onReply}
            onDelete={onDelete}
            onIgnore={onIgnore}
            onUnignore={onUnignore}
            onMute={onMute}
            onBan={onBan}
            onSiteBan={onSiteBan}
            onEdit={onEdit}
            onNavigateToProfile={onNavigateToProfile}
            onNicknameClick={onNicknameClick}
            onImageClick={onImageClick}
            onPrivateMessage={onPrivateMessage}
            onReplyClick={handleReplyClick}
            chatBackgroundColor={chatBackgroundColor}
            onPin={onPin}
            onThread={onThread}
          />
        ))}
      </div>

      {/* Pagination Controls - Show when there are multiple pages */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 py-2 border-t border-border bg-card/50 shrink-0 w-full flex-wrap px-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-7 px-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="h-7 w-7 p-0 text-xs"
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-7 px-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Bottom Controls Panel */}
      {(onShowIgnoreList || onColorChange || onEditTopic || onDeleteTopic || onClearRoom || onAddTopic) && (
        <div className="py-3 px-3 border-t border-border bg-card/50 w-full space-y-2">
          {/* User Controls Row - visible to all */}
          {(onShowIgnoreList || onColorChange) && (
            <div className="flex items-center gap-2 justify-center">
              {onShowIgnoreList && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowIgnoreList}
                  className="gap-2 h-9 relative"
                >
                  <UserX className="w-4 h-4" />
                  იგნორთა სია
                  {ignoredCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {ignoredCount}
                    </span>
                  )}
                </Button>
              )}
              
              {onColorChange && (
                <div className="flex items-center gap-2">
                  <ChatColorPicker 
                    onColorChange={onColorChange} 
                    currentColor={chatColor || ''} 
                  />
                  <span className="text-xs text-muted-foreground">ფონის ფერი</span>
                </div>
              )}
            </div>
          )}

          {/* Super Admin Topic Controls */}
          {isSuperAdmin && (onEditTopic || onDeleteTopic) && (
            <div className="flex items-center gap-2 justify-center">
              {onEditTopic && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditTopic}
                  className="gap-2 h-9"
                >
                  <Pencil className="w-4 h-4" />
                  თემის რედაქტირება
                </Button>
              )}
              {onDeleteTopic && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDeleteTopic}
                  className="gap-2 h-9 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  თემის წაშლა
                </Button>
              )}
            </div>
          )}

          {/* Admin Room Cleanup */}
          {onClearRoom && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearRoom}
              className="w-full gap-2 h-9"
            >
              <Trash2 className="w-4 h-4" />
              ოთახის დასუფთავება
            </Button>
          )}

          {/* Super Admin Add Topic */}
          {onAddTopic && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddTopic}
              className="w-full gap-2 h-9"
            >
              <Plus className="w-4 h-4" />
              დღის თემის დაწერა
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

MessagesPaginated.displayName = 'MessagesPaginated';

export default MessagesPaginated;
