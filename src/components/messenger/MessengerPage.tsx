import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users, Plus, Settings, ArrowLeft, MoreHorizontal, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMessengerConversations } from './hooks/useMessengerConversations';
import { useMessengerGroups } from './hooks/useMessengerGroups';
import { useSystemMessages, SystemMessageDelivery } from '@/hooks/useSystemMessages';
import { getOnlineGracePeriodMinutes, isUserOnlineByLastSeen } from '@/hooks/useOnlineStatus';
import MessengerConversationList from './MessengerConversationList';
import MessengerChatView from './MessengerChatView';
import SystemMessageViewer from './SystemMessageViewer';
import { GroupChatView, CreateGroupModal } from './groups';
import { MessengerSettingsModal } from './settings';
import { MessengerConversation, MessengerGroup } from './types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerMessagesRefresh, triggerNotificationRefresh } from '@/utils/notificationEvents';

interface MessengerPageProps {
  initialUserId?: string | null;
  onClearInitialUser?: () => void;
  onBack?: () => void;
}

type ActiveChat = 
  | { type: 'conversation'; data: MessengerConversation }
  | { type: 'group'; data: MessengerGroup }
  | { type: 'system'; data: SystemMessageDelivery }
  | null;

const MessengerPage = ({ initialUserId, onClearInitialUser, onBack }: MessengerPageProps = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const { 
    conversations, 
    loading: conversationsLoading,
    loadingMore: conversationsLoadingMore,
    hasMore: conversationsHasMore,
    getOrCreateConversation, 
    fetchConversations,
    loadMore: loadMoreConversations,
    clearUnreadCount,
    deleteConversation: deleteConversationFromList,
    deleteAllConversations
  } = useMessengerConversations();
  
  const { 
    groups, 
    loading: groupsLoading, 
    createGroup,
    leaveGroup 
  } = useMessengerGroups();

  // System Messages
  const {
    pinnedMessages: pinnedSystemMessages,
    markAsOpened: markSystemMessageOpened,
    deleteMessage: deleteSystemMessage,
  } = useSystemMessages();

  // Mark all messages as read across all conversations
  const handleMarkAllAsRead = async () => {
    if (!user?.id || conversations.length === 0) return;
    setMarkingAllRead(true);
    try {
      const convIds = conversations.map(c => c.id);
      const { error } = await supabase
        .from('messenger_messages')
        .update({ read_at: new Date().toISOString(), status: 'read' })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      toast.success('ყველა შეტყობინება წაკითხულად მოინიშნა');
      fetchConversations();
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
    if (!user?.id || conversations.length === 0) return;
    setDeletingAll(true);
    try {
      const success = await deleteAllConversations();
      
      if (success) {
        toast.success('ყველა საუბარი წაიშალა');
        setActiveChat(null);
        setShowDeleteAll(false);
        // Trigger global refresh for all badge counts
        triggerMessagesRefresh();
      } else {
        toast.error('წაშლა ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Error deleting all:', error);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setDeletingAll(false);
    }
  };

  // Handle URL params or prop for opening specific conversation
  useEffect(() => {
    const urlUserId = searchParams.get('user');
    const targetUserId = initialUserId || urlUserId;
    
    if (targetUserId && user?.id && !conversationsLoading) {
      handleOpenConversationWithUser(targetUserId);
    }
  }, [searchParams, user?.id, initialUserId, conversations, conversationsLoading]);

  // Handle pending user ID after conversations are loaded
  useEffect(() => {
    if (pendingUserId && !conversationsLoading && conversations.length > 0) {
      const conv = conversations.find(c => c.other_user?.user_id === pendingUserId);
      if (conv) {
        setActiveChat({ type: 'conversation', data: conv });
        setPendingUserId(null);
      }
    }
  }, [pendingUserId, conversationsLoading, conversations]);

  const handleOpenConversationWithUser = async (targetUserId: string) => {
    const existingConv = conversations.find(c => 
      c.other_user?.user_id === targetUserId
    );
    
    if (existingConv) {
      setActiveChat({ type: 'conversation', data: existingConv });
      clearUnreadCount(existingConv.id);
    } else {
      const newConvId = await getOrCreateConversation(targetUserId);
      if (newConvId) {
        // Directly fetch the conversation and other user's profile
        // This fixes the issue where conversation is not in paginated list
        const [convResult, profileResult] = await Promise.all([
          supabase
            .from('messenger_conversations')
            .select('*')
            .eq('id', newConvId)
            .single(),
          supabase
            .from('profiles')
            .select('user_id, username, avatar_url, gender, online_visible_until, last_seen')
            .eq('user_id', targetUserId)
            .single()
        ]);
        
        if (convResult.data && profileResult.data) {
          const profile = profileResult.data;
          const gracePeriodMinutes = await getOnlineGracePeriodMinutes();
          
          // Check online: try online_visible_until first, then last_seen
          const isOnline = profile.online_visible_until 
            ? new Date(profile.online_visible_until) > new Date()
            : isUserOnlineByLastSeen(profile.last_seen, gracePeriodMinutes);
          
          const newConversation: MessengerConversation = {
            ...convResult.data,
            other_user: {
              user_id: profile.user_id,
              username: profile.username,
              avatar_url: profile.avatar_url,
              gender: profile.gender || undefined,
              is_online: isOnline,
              last_seen: profile.last_seen,
            },
            unread_count: 0,
          };
          setActiveChat({ type: 'conversation', data: newConversation });
        }
        
        // Also refresh the list in background
        fetchConversations();
      }
    }
    
    setSearchParams({});
    onClearInitialUser?.();
  };

  const handleSelectConversation = (conversation: MessengerConversation) => {
    setActiveChat({ type: 'conversation', data: conversation });
    // Optimistically clear unread count when conversation is opened
    clearUnreadCount(conversation.id);
  };

  const handleSelectGroup = (group: MessengerGroup) => {
    setActiveChat({ type: 'group', data: group });
  };

  const handleBack = () => {
    setActiveChat(null);
  };

  const handleNewConversation = () => {
    // TODO: Open user search modal
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const groupId = await createGroup(name, memberIds);
    if (groupId) {
      // Find the newly created group and select it
      const newGroup = groups.find(g => g.id === groupId);
      if (newGroup) {
        setActiveChat({ type: 'group', data: newGroup });
      }
      setShowCreateGroup(false);
    }
    return groupId;
  };

  const handleLeaveGroup = async () => {
    if (activeChat?.type === 'group') {
      await leaveGroup(activeChat.data.id);
      setActiveChat(null);
    }
  };

  // Callback when messages are marked as read in chat view
  const handleMessagesRead = useCallback(() => {
    // Refetch conversations to update unread counts
    fetchConversations();
  }, [fetchConversations]);

  // Filter items based on search
  const filteredConversations = conversations.filter(c => 
    !searchQuery.trim() || 
    c.other_user?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    !searchQuery.trim() ||
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mobile layout: show list or chat
  if (isMobile) {
    if (activeChat?.type === 'conversation') {
      return (
        <MessengerChatView
          conversation={activeChat.data}
          onBack={handleBack}
          isMobile
          onMessagesRead={handleMessagesRead}
          onDeleteConversation={deleteConversationFromList}
        />
      );
    }

    if (activeChat?.type === 'group') {
      return (
        <GroupChatView
          group={activeChat.data}
          onBack={handleBack}
          onLeaveGroup={handleLeaveGroup}
          isMobile
        />
      );
    }

    if (activeChat?.type === 'system') {
      return (
        <SystemMessageViewer
          delivery={activeChat.data}
          onBack={handleBack}
          onMarkAsOpened={markSystemMessageOpened}
          onDelete={deleteSystemMessage}
        />
      );
    }

    return (
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        {/* Header with tabs - FIXED at top */}
        <div className="flex-shrink-0 sticky top-0 z-30 bg-background flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onBack ? onBack() : navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chats' | 'groups')}>
              <TabsList className="grid w-[180px] grid-cols-2">
                <TabsTrigger value="chats">ჩატები</TabsTrigger>
                <TabsTrigger value="groups">ჯგუფები</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex gap-1">
            {activeTab === 'groups' && (
              <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(true)}>
                <Plus className="w-5 h-5" />
              </Button>
            )}
            {activeTab === 'chats' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={handleMarkAllAsRead}
                    disabled={markingAllRead || conversations.length === 0}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    {markingAllRead ? 'იტვირთება...' : 'ყველას წაკითხულად მონიშვნა'}
                  </DropdownMenuItem>
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
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content based on active tab - with proper flex container for scroll */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'chats' ? (
            <MessengerConversationList
              conversations={filteredConversations}
              activeConversationId={null}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isLoading={conversationsLoading}
              isLoadingMore={conversationsLoadingMore}
              hasMore={conversationsHasMore}
              onLoadMore={loadMoreConversations}
              onRefresh={() => fetchConversations(true)}
              onOpenSettings={() => setShowSettings(true)}
              onDeleteConversation={deleteConversationFromList}
              onDeleteAllConversations={deleteAllConversations}
              pinnedSystemMessages={pinnedSystemMessages}
              onSelectSystemMessage={(delivery) => setActiveChat({ type: 'system', data: delivery })}
              hideHeader
            />
          ) : (
            <ScrollArea className="h-full">
              {groupsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Users className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">ჯგუფები არ გაქვთ</p>
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => setShowCreateGroup(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ახალი ჯგუფი
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold truncate">{group.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {group.member_count} მონაწილე
                        </p>
                      </div>
                      {(group.unread_count || 0) > 0 && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {group.unread_count}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <CreateGroupModal
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onCreateGroup={handleCreateGroup}
        />

        <MessengerSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

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
  }

  // Desktop layout: side-by-side
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Conversation/Group list - left panel */}
      <div className="w-[360px] border-r border-border flex-shrink-0 flex flex-col overflow-hidden">
        {/* Header - FIXED */}
        <div className="flex-shrink-0 sticky top-0 z-20 bg-background flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onBack ? onBack() : navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chats' | 'groups')}>
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="chats">ჩატები</TabsTrigger>
                <TabsTrigger value="groups">ჯგუფები</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex gap-1">
            {activeTab === 'groups' && (
              <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(true)}>
                <Plus className="w-5 h-5" />
              </Button>
            )}
            {activeTab === 'chats' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={handleMarkAllAsRead}
                    disabled={markingAllRead || conversations.length === 0}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    {markingAllRead ? 'იტვირთება...' : 'ყველას წაკითხულად მონიშვნა'}
                  </DropdownMenuItem>
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
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'chats' ? (
          <MessengerConversationList
            conversations={filteredConversations}
            activeConversationId={activeChat?.type === 'conversation' ? activeChat.data.id : null}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoading={conversationsLoading}
            isLoadingMore={conversationsLoadingMore}
            hasMore={conversationsHasMore}
            onLoadMore={loadMoreConversations}
            onRefresh={() => fetchConversations(true)}
            onOpenSettings={() => setShowSettings(true)}
            onDeleteConversation={deleteConversationFromList}
            onDeleteAllConversations={deleteAllConversations}
            pinnedSystemMessages={pinnedSystemMessages}
            onSelectSystemMessage={(delivery) => setActiveChat({ type: 'system', data: delivery })}
          />
        ) : (
          <ScrollArea className="flex-1">
            {groupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Users className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">ჯგუფები არ გაქვთ</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => setShowCreateGroup(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  ახალი ჯგუფი
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors",
                      activeChat?.type === 'group' && activeChat.data.id === group.id && "bg-muted"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold truncate">{group.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.member_count} მონაწილე
                      </p>
                    </div>
                    {(group.unread_count || 0) > 0 && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {group.unread_count}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {/* Chat view - right panel */}
      <div className="flex-1 min-w-0">
        {activeChat?.type === 'conversation' ? (
          <MessengerChatView
            conversation={activeChat.data}
            onBack={handleBack}
            onMessagesRead={handleMessagesRead}
            onDeleteConversation={deleteConversationFromList}
          />
        ) : activeChat?.type === 'group' ? (
          <GroupChatView
            group={activeChat.data}
            onBack={handleBack}
            onLeaveGroup={handleLeaveGroup}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <span className="text-5xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              თქვენი შეტყობინებები
            </h2>
            <p className="text-muted-foreground max-w-sm">
              აირჩიეთ საუბარი ან ჯგუფი მარცხნივ, ან დაიწყეთ ახალი
            </p>
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      <MessengerSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

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
};

export default MessengerPage;
