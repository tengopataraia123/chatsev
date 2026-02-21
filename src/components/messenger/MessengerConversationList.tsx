import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { Search, Edit, MoreHorizontal, Trash2, CheckCheck, RefreshCw, Bell, BellOff, Settings, Loader2, Ban, Radio, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MessengerConversation } from './types';
import { getAvatarUrl } from '@/lib/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { SystemMessageDelivery } from '@/hooks/useSystemMessages';
import { triggerMessagesRefresh } from '@/utils/notificationEvents';
import { CHEGE_USER_ID, PIKASO_USER_ID } from '@/utils/rootUtils';

interface MessengerConversationListProps {
  conversations: MessengerConversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: MessengerConversation) => void;
  onNewConversation: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  hideHeader?: boolean;
  onOpenSettings?: () => void;
  onDeleteConversation?: (conversationId: string) => Promise<boolean>;
  onDeleteAllConversations?: () => Promise<boolean>;
  // System Messages props
  pinnedSystemMessages?: SystemMessageDelivery[];
  onSelectSystemMessage?: (delivery: SystemMessageDelivery) => void;
}

const MessengerConversationList = memo(({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  searchQuery,
  onSearchChange,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRefresh,
  hideHeader = false,
  onOpenSettings,
  onDeleteConversation,
  onDeleteAllConversations,
  pinnedSystemMessages = [],
  onSelectSystemMessage
}: MessengerConversationListProps) => {
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter(conv => 
    conv.other_user?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMore || isLoadingMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load more when 100px from bottom
    if (scrollHeight - scrollTop - clientHeight < 100) {
      onLoadMore?.();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Mark all messages as read across all conversations
  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const convIds = conversations.map(c => c.id);
      if (convIds.length === 0) return;

      const { error } = await supabase
        .from('messenger_messages')
        .update({ read_at: new Date().toISOString(), status: 'read' })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      toast.success('ყველა შეტყობინება წაკითხულად მოინიშნა');
      onRefresh?.();
      // Trigger global refresh for all badge counts
      triggerMessagesRefresh();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('შეცდომა');
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Delete all conversations and their messages
  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      if (onDeleteAllConversations) {
        const success = await onDeleteAllConversations();
        if (success) {
          toast.success('ყველა საუბარი წაიშალა');
          setShowDeleteAll(false);
          // Trigger global refresh for all badge counts
          triggerMessagesRefresh();
        } else {
          toast.error('წაშლა ვერ მოხერხდა');
        }
      } else {
        // Fallback: delete directly (legacy behavior)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const convIds = conversations.map(c => c.id);
        if (convIds.length === 0) return;

        const { error: msgError } = await supabase
          .from('messenger_messages')
          .delete()
          .in('conversation_id', convIds);

        if (msgError) throw msgError;

        const { error: convError } = await supabase
          .from('messenger_conversations')
          .delete()
          .in('id', convIds);

        if (convError) throw convError;

        toast.success('ყველა საუბარი წაიშალა');
        onRefresh?.();
        setShowDeleteAll(false);
        // Trigger global refresh for all badge counts
        triggerMessagesRefresh();
      }
    } catch (error) {
      console.error('Error deleting all:', error);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Header - conditionally shown */}
      {!hideHeader && (
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">ჩატები</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={onNewConversation}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                title="ახალი მიმოწერა"
              >
                <Edit className="w-5 h-5 text-muted-foreground" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-muted rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={handleMarkAllAsRead}
                    disabled={markingAllRead || conversations.length === 0}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    {markingAllRead ? 'იტვირთება...' : 'ყველას წაკითხულად მონიშვნა'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRefresh?.()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    განახლება
                  </DropdownMenuItem>
                  {onOpenSettings && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onOpenSettings}>
                        <Settings className="w-4 h-4 mr-2" />
                        პარამეტრები
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteAll(true)}
                    disabled={conversations.length === 0}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ყველა საუბრის წაშლა
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ძებნა Messenger-ში"
              className="pl-10 bg-muted border-0 h-10 text-base"
            />
          </div>
        </div>
      )}
      
      {/* Search when header is hidden */}
      {hideHeader && (
        <div className="p-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ძებნა Messenger-ში"
              className="pl-10 bg-muted border-0 h-10 text-base"
            />
          </div>
        </div>
      )}

      {/* Conversations List with infinite scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="p-2">
          {isLoading ? (
            <ConversationListSkeleton count={6} />
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium">
                {searchQuery ? 'მომხმარებელი ვერ მოიძებნა' : 'ჯერ არ გაქვთ საუბრები'}
              </p>
              <p className="text-sm mt-1 text-muted-foreground/70">
                {searchQuery ? 'სცადეთ სხვა საძიებო სიტყვა' : 'დაიწყეთ ახალი საუბარი'}
              </p>
            </div>
          ) : (
            <>
              {/* Pinned System Messages - Always on top */}
              {pinnedSystemMessages.length > 0 && !searchQuery && (
                <div className="mb-2">
                  {pinnedSystemMessages.map((delivery) => (
                    <div
                      key={delivery.id}
                      onClick={() => onSelectSystemMessage?.(delivery)}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer transition-all duration-200",
                        "hover:bg-secondary/50 rounded-lg border mb-1",
                        "bg-amber-500/5 border-amber-500/30 border-l-4 border-l-amber-500"
                      )}
                    >
                      {/* System Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                          <Radio className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <Pin className="w-3 h-3 text-white" />
                        </div>
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
                          {!delivery.opened_at && (
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        
                        <p className={cn(
                          "text-sm truncate",
                          !delivery.opened_at ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {delivery.message.title || delivery.message.body}
                        </p>
                        
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(delivery.message.sent_at || delivery.message.created_at), {
                            addSuffix: true,
                            locale: ka
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={activeConversationId === conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  onDelete={onDeleteConversation}
                />
              ))}
              
              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
              
              {/* End of list indicator */}
              {!hasMore && filteredConversations.length > 10 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  ყველა საუბარი ჩაიტვირთა
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete All Dialog */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ყველა საუბრის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ ყველა საუბრის წაშლა? 
              ეს მოქმედება შეუქცევადია და წაიშლება ყველა შეტყობინება.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll ? 'იშლება...' : 'წაშლა'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

MessengerConversationList.displayName = 'MessengerConversationList';

// Skeleton loader for conversations
const ConversationListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-full max-w-[200px]" />
        </div>
      </div>
    ))}
  </div>
);

// Individual conversation item with improved layout
const ConversationItem = memo(({
  conversation,
  isActive,
  onClick,
  onDelete
}: {
  conversation: MessengerConversation;
  isActive: boolean;
  onClick: () => void;
  onDelete?: (conversationId: string) => Promise<boolean>;
}) => {
  const { user } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [showIgnore, setShowIgnore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  
  const otherUser = conversation.other_user;
  const isRootAdmin = user?.id === CHEGE_USER_ID || user?.id === PIKASO_USER_ID;
  const isChegeUser = user?.id === CHEGE_USER_ID;
  const isDeletedByOther = conversation.is_deleted_by_other;

  // Ignore user directly from inbox (no profile access needed)
  const handleIgnore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || !otherUser?.user_id) return;
    
    setIgnoring(true);
    try {
      // Insert block
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: otherUser.user_id
        });
      
      if (error) throw error;
      
      // Soft-delete: preserve messages for inspectors, record deletion
      const { data: msgs } = await supabase
        .from('messenger_messages')
        .select('id, content, image_urls, video_url, voice_url, file_url, gif_id')
        .eq('conversation_id', conversation.id)
        .eq('is_deleted', false);

      if (msgs && msgs.length > 0) {
        for (const msg of msgs) {
          await supabase
            .from('messenger_messages')
            .update({
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              deleted_by_user_id: user.id,
              original_content: msg.content,
              original_image_urls: msg.image_urls,
              original_video_url: msg.video_url,
              original_voice_url: msg.voice_url,
              original_file_url: msg.file_url,
              original_gif_id: msg.gif_id,
              content: null,
              image_urls: null,
              video_url: null,
              voice_url: null,
              file_url: null,
              gif_id: null,
            })
            .eq('id', msg.id);
        }
      }

      await supabase
        .from('messenger_conversation_deletions')
        .upsert({
          conversation_id: conversation.id,
          user_id: user.id,
          deleted_at: new Date().toISOString(),
        }, { onConflict: 'conversation_id,user_id' });
      
      toast.success(`${otherUser.username} დაიგნორებულია`);
      setShowIgnore(false);
    } catch (err) {
      console.error('Error ignoring user:', err);
      toast.error('დაიგნორება ვერ მოხერხდა');
    } finally {
      setIgnoring(false);
    }
  };
  const hasUnread = (conversation.unread_count || 0) > 0;
  
  // Format time without "დაახლოებით"
  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), { 
        addSuffix: false, 
        locale: ka 
      }).replace(/^დაახლოებით\s*/i, '')
    : '';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      if (onDelete) {
        const success = await onDelete(conversation.id);
        if (success) {
          toast.success('საუბარი წაიშალა');
          setShowDelete(false);
        } else {
          toast.error('წაშლა ვერ მოხერხდა');
        }
      } else {
        // Fallback: soft-delete (preserve for inspectors)
        const { data: msgs } = await supabase
          .from('messenger_messages')
          .select('id, content, image_urls, video_url, voice_url, file_url, gif_id')
          .eq('conversation_id', conversation.id)
          .eq('is_deleted', false);

        if (msgs && msgs.length > 0) {
          for (const msg of msgs) {
            await supabase
              .from('messenger_messages')
              .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by_user_id: user.id,
                original_content: msg.content,
                original_image_urls: msg.image_urls,
                original_video_url: msg.video_url,
                original_voice_url: msg.voice_url,
                original_file_url: msg.file_url,
                original_gif_id: msg.gif_id,
                content: null,
                image_urls: null,
                video_url: null,
                voice_url: null,
                file_url: null,
                gif_id: null,
              })
              .eq('id', msg.id);
          }
        }

        await supabase
          .from('messenger_conversation_deletions')
          .upsert({
            conversation_id: conversation.id,
            user_id: user?.id,
            deleted_at: new Date().toISOString(),
          }, { onConflict: 'conversation_id,user_id' });

        toast.success('საუბარი წაიშალა');
        setShowDelete(false);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group relative cursor-pointer",
          isActive ? "bg-primary/10" : "hover:bg-muted/70",
          hasUnread && "bg-primary/5",
          isRootAdmin && isDeletedByOther && "border border-destructive/30 bg-destructive/5"
        )}
        onClick={onClick}
      >
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-14 h-14">
            <AvatarImage 
              src={getAvatarUrl(otherUser?.avatar_url || null, otherUser?.gender)} 
              alt={otherUser?.username} 
            />
            <AvatarFallback className="bg-primary/20 text-primary text-lg font-semibold">
              {otherUser?.username?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          {otherUser?.is_online && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>

        {/* Content - improved layout */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Name row */}
           <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              "font-semibold truncate min-w-0 text-[15px]",
              hasUnread ? "text-foreground" : "text-foreground/90",
              isRootAdmin && isDeletedByOther && "flex-shrink"
            )}>
              {otherUser?.username || 'მომხმარებელი'}
            </span>
            {isRootAdmin && isDeletedByOther && (
              <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                წაშლილი
              </span>
            )}
            <span className="flex-1" />
            {timeAgo && (
              <span className={cn(
                "text-xs whitespace-nowrap flex-shrink-0",
                hasUnread ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {timeAgo}
              </span>
            )}
          </div>
          
          {/* Preview row */}
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm truncate flex-1 min-w-0 leading-tight",
              hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
            )} style={{ 
              display: '-webkit-box', 
              WebkitLineClamp: 1, 
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}>
              {conversation.last_message_preview || 'დაიწყეთ საუბარი'}
            </p>
            {hasUnread && (
              <span className="min-w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold flex-shrink-0 px-1.5">
                {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons - visible on hover (desktop only) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowIgnore(true);
            }}
            className="p-2 hover:bg-muted rounded-full"
            title="დაიგნორება"
          >
            <Ban className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(true);
            }}
            className="p-2 hover:bg-destructive/10 rounded-full"
            title="წაშლა"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>საუბრის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ {otherUser?.username}-თან საუბრის წაშლა? 
              ყველა შეტყობინება წაიშლება.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'იშლება...' : 'წაშლა'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ignore Dialog */}
      <AlertDialog open={showIgnore} onOpenChange={setShowIgnore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>მომხმარებლის დაიგნორება</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ {otherUser?.username}-ის დაიგნორება? 
              მისგან შეტყობინებებს ვეღარ მიიღებთ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleIgnore}
              disabled={ignoring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ignoring ? 'იგნორდება...' : 'დაიგნორება'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

ConversationItem.displayName = 'ConversationItem';

export default MessengerConversationList;