import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessengerConversation, MessengerMessage } from './types';
import { useMessengerMessages } from './hooks/useMessengerMessages';
import { useMessengerTyping } from './hooks/useMessengerTyping';
import { useMessagingPermissions } from '@/hooks/useMessagingPermissions';
import MessengerChatHeader from './MessengerChatHeader';
import MessengerMessageBubble from './MessengerMessageBubble';
import MessengerChatInput from './MessengerChatInput';
import { useAuth } from '@/hooks/useAuth';
// Call feature removed
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessengerChatViewProps {
  conversation: MessengerConversation;
  onBack: () => void;
  isMobile?: boolean;
  onMessagesRead?: () => void;
  onDeleteConversation?: (conversationId: string) => Promise<boolean>;
}

const MessengerChatView = memo(({
  conversation,
  onBack,
  isMobile = false,
  onMessagesRead,
  onDeleteConversation
}: MessengerChatViewProps) => {
  const { user } = useAuth();
  // Call feature removed
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<MessengerMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessengerMessage | null>(null);
  const hasMarkedAsReadRef = useRef(false);

  // Use messaging permissions hook - includes admin bypass for media
  const { canSendMedia, isFriend } = useMessagingPermissions(conversation.other_user?.user_id);

  const {
    messages,
    loading: isLoading,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    markAllAsRead,
    deleteAllMessages,
    deleteConversation,
  } = useMessengerMessages(conversation.id);

  const { isOtherTyping: otherUserTyping, startTyping, stopTyping } = useMessengerTyping(
    conversation.id
  );

  // Call feature removed

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle typing status
  const handleTyping = useCallback((isTyping: boolean) => {
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // Mark messages as read on mount and when conversation changes
  useEffect(() => {
    if (!conversation.id || !user?.id) return;
    
    // Reset the ref when conversation changes
    hasMarkedAsReadRef.current = false;
  }, [conversation.id, user?.id]);

  // Mark as read after messages load
  useEffect(() => {
    if (!conversation.id || !user?.id || isLoading || hasMarkedAsReadRef.current) return;
    
    const markAsRead = async () => {
      hasMarkedAsReadRef.current = true;
      const success = await markAllAsRead();
      if (success) {
        // Notify parent to refresh conversation list
        onMessagesRead?.();
      }
    };
    
    // Small delay to ensure component is mounted
    const timer = setTimeout(markAsRead, 200);
    return () => clearTimeout(timer);
  }, [conversation.id, user?.id, isLoading, markAllAsRead, onMessagesRead]);

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
        gif_url: gifUrl, // Pass URL for optimistic display
        reply_to_id: replyTo?.id || undefined
      });
      setReplyTo(null);
    } catch (error) {
      toast.error('GIF ვერ გაიგზავნა');
    }
  };

  const handleEditMessage = async (content: string) => {
    if (!editingMessage) return;
    try {
      await editMessage(editingMessage.id, content);
      setEditingMessage(null);
    } catch (error) {
      toast.error('შეტყობინება ვერ შეიცვალა');
    }
  };

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    try {
      await deleteMessage(messageId, forEveryone);
    } catch (error) {
      toast.error('შეტყობინება ვერ წაიშალა');
    }
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    try {
      await deleteMessage(messageId, false);
    } catch (error) {
      toast.error('შეტყობინება ვერ წაიშალა');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      toast.error('რეაქცია ვერ დაემატა');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('დაკოპირდა');
  };

  const handleDeleteAllMessages = async () => {
    try {
      const success = await deleteAllMessages();
      if (success) {
        toast.success('ყველა შეტყობინება წაიშალა');
      } else {
        toast.error('წაშლა ვერ მოხერხდა');
      }
    } catch (error) {
      toast.error('წაშლა ვერ მოხერხდა');
    }
  };

  const handleDeleteConversation = async (forEveryone: boolean) => {
    try {
      // If we have the parent delete function, use it to actually delete from DB
      if (onDeleteConversation) {
        const success = await onDeleteConversation(conversation.id);
        if (success) {
          toast.success(forEveryone ? 'მიმოწერა წაიშალა ყველასთვის' : 'მიმოწერა წაიშალა');
          onBack();
          return;
        }
      }
      
      // Fallback: delete messages only
      const success = await deleteConversation(forEveryone);
      if (success) {
        toast.success(forEveryone ? 'მიმოწერა წაიშალა ყველასთვის' : 'მიმოწერა წაიშალა');
        onBack();
      } else {
        toast.error('მიმოწერა ვერ წაიშალა');
      }
    } catch (error) {
      toast.error('მიმოწერა ვერ წაიშალა');
    }
  };

  // Handle blocking user from chat
  const handleBlock = useCallback(async () => {
    const otherUserId = conversation.other_user?.user_id;
    if (!user?.id || !otherUserId) return;
    
    try {
      // Check if already blocked
      const { data: existingBlock } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', otherUserId)
        .maybeSingle();
      
      if (existingBlock) {
        // Unblock
        await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', otherUserId);
        toast.success('იგნორი მოიხსნა');
      } else {
        // Block user
        await supabase
          .from('user_blocks')
          .insert({
            blocker_id: user.id,
            blocked_id: otherUserId
          });
        
        // Delete the conversation completely for both users
        // First delete all messages
        await supabase
          .from('messenger_messages')
          .delete()
          .eq('conversation_id', conversation.id);
        
        // Then delete the conversation
        await supabase
          .from('messenger_conversations')
          .delete()
          .eq('id', conversation.id);
        
        toast.success('მომხმარებელი დაიგნორდა');
        // Navigate back after blocking
        onBack();
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('შეცდომა დაბლოკვისას');
    }
  }, [user?.id, conversation.other_user?.user_id, conversation.id, onBack]);

  // Group messages by sender for consecutive messages
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const prevMsg = messages[idx - 1];
    const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
    acc.push({ ...msg, showAvatar });
    return acc;
  }, [] as (MessengerMessage & { showAvatar: boolean })[]);

  const chatContent = (
    <div className={cn(
      "flex flex-col bg-background overflow-hidden",
      isMobile ? "fixed inset-0 z-60" : "h-full"
    )}>
      {/* Header - always fixed at top */}
      <div className="flex-shrink-0 sticky top-0 z-20">
        <MessengerChatHeader
          conversation={conversation}
          onBack={onBack}
          isTyping={otherUserTyping}
          isMobile={isMobile}
          
          onDeleteAllMessages={handleDeleteAllMessages}
          onDeleteConversation={handleDeleteConversation}
          onBlock={handleBlock}
          isFriend={isFriend}
        />
      </div>

      {/* Messages - improved scrolling */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-2"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          minHeight: 0 // Important for flex children to respect overflow
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-4xl">👋</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              დაიწყეთ საუბარი
            </h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              გაუგზავნეთ პირველი შეტყობინება {conversation.other_user?.username}-ს
            </p>
          </div>
        ) : (
          <div className="space-y-1 min-h-full flex flex-col justify-end">
            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  className="text-xs text-muted-foreground gap-1"
                >
                  <ChevronUp className="w-3 h-3" />
                  ძველი შეტყობინებები
                </Button>
              </div>
            )}
            {groupedMessages.map((msg) => (
              <MessengerMessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === user?.id}
                showAvatar={msg.showAvatar}
                theme={conversation.theme}
                currentUserId={user?.id || ''}
                onReact={(emoji) => handleReaction(msg.id, emoji)}
                onReply={() => setReplyTo(msg)}
                onEdit={() => setEditingMessage(msg)}
                onDelete={(forEveryone) => handleDeleteMessage(msg.id, forEveryone)}
                onDeleteForMe={() => handleDeleteMessageForMe(msg.id)}
                onCopyText={() => msg.content && handleCopyText(msg.content)}
              />
            ))}
            
            {/* Typing indicator */}
            {otherUserTyping && (
              <div className="flex items-center gap-2 pl-9">
                <div className="bg-muted rounded-full px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input - flex-shrink-0 to prevent keyboard issues */}
      <div className="flex-shrink-0">
        <MessengerChatInput
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          onSendGif={handleSendGif}
          onTyping={handleTyping}
          theme={conversation.theme}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSaveEdit={handleEditMessage}
          customEmoji={conversation.custom_emoji}
          canSendMedia={canSendMedia}
        />
      </div>
    </div>
  );

  // Mobile: render as portal
  if (isMobile) {
    return createPortal(chatContent, document.body);
  }

  return chatContent;
});

MessengerChatView.displayName = 'MessengerChatView';

export default MessengerChatView;
