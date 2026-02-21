/**
 * Group Chat View
 */
import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessengerGroup, MessengerGroupMessage } from '../types';
import { useMessengerGroupMessages } from '../hooks/useMessengerGroupMessages';
import GroupChatHeader from './GroupChatHeader';
import MessengerMessageBubble from '../MessengerMessageBubble';
import MessengerChatInput from '../MessengerChatInput';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface GroupChatViewProps {
  group: MessengerGroup;
  onBack: () => void;
  onLeaveGroup?: () => void;
  isMobile?: boolean;
}

const GroupChatView = memo(({
  group,
  onBack,
  onLeaveGroup,
  isMobile = false
}: GroupChatViewProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<MessengerGroupMessage | null>(null);

  const {
    messages,
    loading: isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
  } = useMessengerGroupMessages(group.id);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage({
        content,
        reply_to_id: replyTo?.id || undefined
      });
      setReplyTo(null);
    } catch (error) {
      toast.error('შეტყობინება ვერ გაიგზავნა');
    }
  };

  const handleSendMedia = async (params: {
    content?: string;
    image_urls?: string[];
    video_url?: string;
    voice_url?: string;
    voice_duration_seconds?: number;
  }) => {
    try {
      await sendMessage({
        ...params,
        reply_to_id: replyTo?.id || undefined
      });
      setReplyTo(null);
    } catch (error) {
      toast.error('მედია ვერ გაიგზავნა');
    }
  };

  const handleSendGif = async (gifId: string, gifUrl: string) => {
    try {
      await sendMessage({
        gif_id: gifId,
        reply_to_id: replyTo?.id || undefined
      });
      setReplyTo(null);
    } catch (error) {
      toast.error('GIF ვერ გაიგზავნა');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      toast.error('რეაქცია ვერ დაემატა');
    }
  };

  // Group messages by sender for consecutive messages
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const prevMsg = messages[idx - 1];
    const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
    acc.push({ ...msg, showAvatar });
    return acc;
  }, [] as (MessengerGroupMessage & { showAvatar: boolean })[]);

  const chatContent = (
    <div className={cn(
      "flex flex-col bg-background",
      isMobile ? "fixed inset-0 z-60" : "h-full"
    )}>
      {/* Header */}
      <GroupChatHeader
        group={group}
        onBack={onBack}
        onLeaveGroup={onLeaveGroup}
        isMobile={isMobile}
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-4xl">👋</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              ჯგუფი შეიქმნა
            </h3>
            <p className="text-sm text-muted-foreground">
              გაუგზავნეთ პირველი შეტყობინება
            </p>
          </div>
        ) : (
          <div className="space-y-1 min-h-full flex flex-col justify-end">
            {groupedMessages.map((msg) => (
              <MessengerMessageBubble
                key={msg.id}
                message={msg as any}
                isOwn={msg.sender_id === user?.id}
                showAvatar={msg.showAvatar}
                theme={group.theme}
                currentUserId={user?.id || ''}
                onReact={(emoji) => handleReaction(msg.id, emoji)}
                onReply={() => setReplyTo(msg)}
                onEdit={() => editMessage(msg.id, msg.content || '')}
                onDelete={() => deleteMessage(msg.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <MessengerChatInput
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        onSendGif={handleSendGif}
        onTyping={() => {}}
        theme={group.theme}
        replyTo={replyTo as any}
        onCancelReply={() => setReplyTo(null)}
        customEmoji={group.custom_emoji}
      />
    </div>
  );

  // Mobile: render as portal
  if (isMobile) {
    return createPortal(chatContent, document.body);
  }

  return chatContent;
});

GroupChatView.displayName = 'GroupChatView';

export default GroupChatView;
