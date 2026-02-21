import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Copy, MessageSquare, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PollShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: string;
  pollQuestion: string;
  pollOwnerId: string;
}

const PollShareDialog = ({ isOpen, onClose, pollId, pollQuestion, pollOwnerId }: PollShareDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareToFeed = async () => {
    if (!user) return;
    setSharing(true);

    try {
      const { error } = await supabase.from('poll_shares').insert({
        poll_id: pollId,
        user_id: user.id,
        caption: caption.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'უკვე გაზიარებული გაქვთ ეს გამოკითხვა', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      // Send notification to poll owner
      if (pollOwnerId !== user.id) {
        try {
          await supabase.from('notifications').insert({
            user_id: pollOwnerId,
            from_user_id: user.id,
            type: 'poll_share',
            message: 'გააზიარა თქვენი გამოკითხვა',
          });
        } catch { /* ignore */ }
      }

      toast({ title: 'გამოკითხვა გაზიარდა!' });
      setCaption('');
      onClose();
    } catch (error) {
      console.error('Share error:', error);
      toast({ title: 'შეცდომა გაზიარებისას', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const pollUrl = `${window.location.origin}/?view=polls&pollId=${pollId}`;
    await navigator.clipboard.writeText(pollUrl);
    setCopied(true);
    toast({ title: 'ბმული დაკოპირდა' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const pollUrl = `${window.location.origin}/?view=polls&pollId=${pollId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pollQuestion,
          text: `გამოკითხვა: ${pollQuestion}`,
          url: pollUrl,
        });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            გამოკითხვის გაზიარება
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share to feed */}
          <div className="space-y-3">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 300))}
              placeholder="დაწერე რაიმე (არასავალდებულო)..."
              className="min-h-[60px] resize-none bg-secondary/30"
              maxLength={300}
            />
            <Button
              onClick={handleShareToFeed}
              disabled={sharing || !user}
              className="w-full"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {sharing ? 'იტვირთება...' : 'Feed-ში გაზიარება'}
            </Button>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            {/* Copy link */}
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="w-full justify-start"
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-primary" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'დაკოპირდა!' : 'ბმულის კოპირება'}
            </Button>

            {/* Native share (mobile) */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button
                variant="outline"
                onClick={handleNativeShare}
                className="w-full justify-start"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                სხვა აპით გაზიარება
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PollShareDialog;
