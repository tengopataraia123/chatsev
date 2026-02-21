import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, MoreVertical, Trash2, Search, Bell, BellOff, Ban, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { MessengerConversation, CHAT_THEME_COLORS, ChatTheme } from './types';
import { getAvatarUrl } from '@/lib/avatar';
import { ReportButton } from '@/components/reports/ReportButton';
import { toast } from 'sonner';

interface MessengerChatHeaderProps {
  conversation: MessengerConversation;
  onBack: () => void;
  
  onOpenSettings?: () => void;
  onChangeTheme?: (theme: ChatTheme) => void;
  onChangeNickname?: () => void;
  onBlock?: () => void;
  onDeleteConversation?: (forEveryone: boolean) => void;
  onDeleteAllMessages?: () => void;
  onMuteConversation?: (muted: boolean) => void;
  onAddFriend?: () => void;
  isTyping?: boolean;
  isMobile?: boolean;
  isMuted?: boolean;
  isFriend?: boolean;
}

const MessengerChatHeader = memo(({
  conversation,
  onBack,
  
  onOpenSettings,
  onChangeTheme,
  onChangeNickname,
  onBlock,
  onDeleteConversation,
  onDeleteAllMessages,
  onMuteConversation,
  onAddFriend,
  isTyping,
  isMobile,
  isMuted = false,
  isFriend = false
}: MessengerChatHeaderProps) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [deleteAllMsgsDialogOpen, setDeleteAllMsgsDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const otherUser = conversation.other_user;
  const themeColor = CHAT_THEME_COLORS[conversation.theme];

  // Navigate to other user's profile
  const handleProfileClick = () => {
    if (otherUser?.user_id) {
      navigate(`/?view=profile&userId=${otherUser.user_id}`);
    }
  };

  const handleDeleteClick = (forEveryone: boolean) => {
    setDeleteForEveryone(forEveryone);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDeleteConversation?.(deleteForEveryone);
    setDeleteDialogOpen(false);
  };

  const handleMuteToggle = () => {
    onMuteConversation?.(!isMuted);
    toast.success(isMuted ? 'შეტყობინებები ჩართულია' : 'შეტყობინებები გამორთულია');
  };

  const handleBlock = () => {
    setBlockDialogOpen(true);
  };

  const handleConfirmBlock = () => {
    onBlock?.();
    setBlockDialogOpen(false);
    toast.success('მომხმარებელი დაიბლოკა');
  };

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 p-3 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0 min-h-[60px]">
        {/* Back button - always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="flex-shrink-0 h-9 w-9"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Avatar - clickable to profile */}
        <div 
          className="relative flex-shrink-0 cursor-pointer"
          onClick={handleProfileClick}
        >
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10 hover:opacity-80 transition-opacity">
            <AvatarImage 
              src={getAvatarUrl(otherUser?.avatar_url || null, otherUser?.gender)} 
              alt={otherUser?.username} 
            />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {otherUser?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {otherUser?.is_online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>

        {/* User info - clickable to profile */}
        <button 
          className="flex-1 min-w-0 overflow-hidden text-left"
          onClick={handleProfileClick}
        >
          <h2 className="font-semibold text-foreground truncate text-sm sm:text-base hover:text-primary transition-colors">
            {conversation.user1_nickname || conversation.user2_nickname || otherUser?.username || 'მომხმარებელი'}
          </h2>
          <p className={cn(
            "text-xs truncate",
            isTyping ? "text-primary" : "text-muted-foreground"
          )}>
            {isTyping ? 'წერს...' : otherUser?.is_online ? 'აქტიურია' : 'არააქტიური'}
          </p>
        </button>

        {/* Add friend button if not friends */}
        {!isFriend && onAddFriend && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddFriend}
            className="text-primary hover:bg-primary/10 h-9 w-9"
            title="მეგობრად დამატება"
          >
            <UserPlus className="w-5 h-5" />
          </Button>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          
          
          
          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* View Profile */}
              <DropdownMenuItem onClick={handleProfileClick}>
                <Info className="w-4 h-4 mr-2" />
                პროფილის ნახვა
              </DropdownMenuItem>
              
              
              
              {/* Search in chat */}
              <DropdownMenuItem onClick={() => setSearchDialogOpen(true)}>
                <Search className="w-4 h-4 mr-2" />
                ძებნა ჩატში
              </DropdownMenuItem>
              
              {/* Mute/Unmute */}
              <DropdownMenuItem onClick={handleMuteToggle}>
                {isMuted ? (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    შეტყობინებების ჩართვა
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    შეტყობინებების გათიშვა
                  </>
                )}
              </DropdownMenuItem>
              
              {onOpenSettings && (
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Info className="w-4 h-4 mr-2" />
                  ჩატის პარამეტრები
                </DropdownMenuItem>
              )}
              
              {onChangeNickname && (
                <DropdownMenuItem onClick={onChangeNickname}>
                  ნიკნეიმის შეცვლა
                </DropdownMenuItem>
              )}
              
              {/* Theme selector */}
              {onChangeTheme && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-2">თემის ფერი</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(CHAT_THEME_COLORS).map(([themeName, colors]) => (
                        <button
                          key={themeName}
                          onClick={() => onChangeTheme(themeName as ChatTheme)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                            conversation.theme === themeName 
                              ? "border-foreground scale-110" 
                              : "border-transparent"
                          )}
                          style={{ backgroundColor: colors.primary }}
                          title={themeName}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              {/* Block user */}
              {onBlock && (
                <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                  <Ban className="w-4 h-4 mr-2" />
                  დაბლოკვა
                </DropdownMenuItem>
              )}
              
              {/* Report */}
              {otherUser && (
                <DropdownMenuItem asChild>
                  <ReportButton
                    contentType="profile"
                    contentId={otherUser.user_id}
                    reportedUserId={otherUser.user_id}
                    variant="menu"
                    showOnlyForOthers={false}
                  />
                </DropdownMenuItem>
              )}
              
              {/* Delete all messages in this conversation */}
              {onDeleteAllMessages && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setDeleteAllMsgsDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ყველა შეტყობინების წაშლა
                  </DropdownMenuItem>
                </>
              )}

              {onDeleteConversation && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteClick(false)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ჩემთვის წაშლა
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDeleteClick(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ყველასთვის წაშლა
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteForEveryone ? 'მიმოწერის წაშლა ყველასთვის' : 'მიმოწერის წაშლა'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteForEveryone 
                ? 'ნამდვილად გსურთ მთელი მიმოწერის წაშლა? ეს წაშლის ყველა შეტყობინებას ორივე მხარისთვის.'
                : 'ნამდვილად გსურთ მიმოწერის წაშლა? შეტყობინებები წაიშლება მხოლოდ თქვენთვის.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>მომხმარებლის დაბლოკვა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ {otherUser?.username}-ის დაბლოკვა? 
              დაბლოკვის შემდეგ ვეღარ მიიღებთ მისგან შეტყობინებებს.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              დაბლოკვა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search in Chat Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ძებნა ჩატში</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="შეტყობინების ძებნა..."
                className="pl-10"
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? 'შედეგი ვერ მოიძებნა' : 'შეიყვანეთ საძიებო სიტყვა'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Messages Confirmation Dialog */}
      <AlertDialog open={deleteAllMsgsDialogOpen} onOpenChange={setDeleteAllMsgsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ყველა შეტყობინების წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ ამ მიმოწერის ყველა შეტყობინების წაშლა? 
              ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDeleteAllMessages?.();
                setDeleteAllMsgsDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

MessengerChatHeader.displayName = 'MessengerChatHeader';

export default MessengerChatHeader;