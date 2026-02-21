import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye } from 'lucide-react';

interface SeenUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  seen_at: string;
}

interface SeenByModalProps {
  isOpen: boolean;
  onClose: () => void;
  seenUsers: SeenUser[];
  onUserClick?: (userId: string) => void;
}

const SeenByModal = ({ isOpen, onClose, seenUsers, onUserClick }: SeenByModalProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ka-GE', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'დღეს';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'გუშინ';
    }
    return date.toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-muted-foreground" />
            ნანახია {seenUsers.length} მომხმარებელმა
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-1">
            {seenUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                ჯერ არავის ნანახი
              </div>
            ) : (
              seenUsers.map((user) => (
                <div 
                  key={user.user_id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    onUserClick?.(user.user_id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{user.username}</span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{formatDate(user.seen_at)}</div>
                    <div className="text-[10px]">{formatTime(user.seen_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SeenByModal;
