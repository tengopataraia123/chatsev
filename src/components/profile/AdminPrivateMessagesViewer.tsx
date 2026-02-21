import { useState } from 'react';
import { Eye, Lock, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { canViewPrivateMessages, isPikaso } from '@/utils/adminAccessUtils';
import { isOwnerById } from '@/utils/ownerUtils';
import InspectorMessagingView from '@/components/messenger/InspectorMessagingView';

interface AdminPrivateMessagesViewerProps {
  targetUserId: string;
  targetUsername?: string;
}

const AdminPrivateMessagesViewer = ({ targetUserId, targetUsername }: AdminPrivateMessagesViewerProps) => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const canView = canViewPrivateMessages(profile?.username);
  
  // CRITICAL: Pikaso cannot view CHEGE's messages at all
  const isPikasoViewer = isPikaso(profile?.username);
  const isTargetOwner = isOwnerById(targetUserId);
  
  // If Pikaso is viewing CHEGE's profile, completely hide this component
  if (isPikasoViewer && isTargetOwner) {
    return null;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Lock className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">
          მიმოწერის ნახვა შეუძლიათ მხოლოდ უმაღლესი დონის ადმინისტრატორებს
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-lg text-red-500">პირადი მიმოწერა</h3>
      </div>

      <div className="bg-card/50 rounded-xl border border-border p-4">
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <MessageCircle className="w-12 h-12 text-primary/30" />
          <p className="text-muted-foreground text-sm text-center">
            ნახეთ ამ მომხმარებლის პირადი მიმოწერა<br />
            <span className="text-xs">(შეტყობინებები არ მოინიშნება წაკითხულად)</span>
          </p>
          <Button
            variant="outline"
            onClick={() => setIsOpen(true)}
            className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400"
          >
            <Eye className="w-4 h-4" />
            მიმოწერის ნახვა
          </Button>
        </div>
      </div>

      <InspectorMessagingView
        open={isOpen}
        onOpenChange={setIsOpen}
        targetUserId={targetUserId}
        targetUsername={targetUsername || 'მომხმარებელი'}
      />
    </div>
  );
};

export default AdminPrivateMessagesViewer;
