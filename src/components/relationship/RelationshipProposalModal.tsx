import { useState } from 'react';
import { Heart, Send, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  RelationshipStatusType, 
} from '@/hooks/useRelationshipStatus';

interface RelationshipProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (status: RelationshipStatusType, message?: string) => Promise<boolean>;
  targetUsername: string;
  loading?: boolean;
}

const RelationshipProposalModal = ({
  isOpen,
  onClose,
  onSend,
  targetUsername,
  loading = false
}: RelationshipProposalModalProps) => {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    const success = await onSend('in_relationship', message.trim() || undefined);
    if (success) {
      setMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            ურთიერთობის შეთავაზება
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            თქვენ აპირებთ <span className="font-medium text-foreground">{targetUsername}</span>-ს 
            ურთიერთობის შეთავაზების გაგზავნას.
          </p>

          <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
            <span className="text-2xl">❤️</span>
            <span className="text-base font-bold text-foreground">ურთიერთობაშია</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">შეტყობინება (არასავალდებულო)</Label>
            <Textarea
              id="message"
              placeholder="დაამატეთ პირადი შეტყობინება..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            გაუქმება
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'იგზავნება...' : 'გაგზავნა'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RelationshipProposalModal;
