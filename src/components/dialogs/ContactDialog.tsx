import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MessageCircle, Send, Sparkles } from 'lucide-react';

// Admin user IDs for direct profile navigation
const ADMIN_USERS = {
  CHEGE: 'b067dbd7-1235-407f-8184-e2f6aef034d3',
  PIKASO: '204eb697-6b0a-453a-beee-d32e0ab72bfd'
};

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSidebarClose?: () => void;
}

export function ContactDialog({ open, onOpenChange, onSidebarClose }: ContactDialogProps) {
  const navigate = useNavigate();

  const handleProfileClick = (userId: string) => {
    onOpenChange(false);
    onSidebarClose?.();
    navigate(`/?view=profile&userId=${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Gradient Header */}
        <DialogHeader className="p-6 pb-4 pr-12 bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10 border-b relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-xl" />
          
          <DialogTitle className="flex items-center gap-3 text-xl relative z-10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">
                დაგვიკავშირდით
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2 pl-14 relative z-10">
            შეარჩიეთ ადმინისტრატორი
          </DialogDescription>
        </DialogHeader>

        {/* Contact Cards */}
        <div className="p-5 space-y-3">
          {/* CHEGE Card */}
          <button
            onClick={() => handleProfileClick(ADMIN_USERS.CHEGE)}
            className="w-full group relative overflow-hidden rounded-xl p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">CHEGE</p>
                <p className="text-xs text-muted-foreground">სუპერ ადმინისტრატორი</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Send className="w-4 h-4 text-primary" />
              </div>
            </div>
          </button>

          {/* PIKASO Card */}
          <button
            onClick={() => handleProfileClick(ADMIN_USERS.PIKASO)}
            className="w-full group relative overflow-hidden rounded-xl p-4 bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-foreground text-lg group-hover:text-accent transition-colors">P ი კ ა S ო</p>
                <p className="text-xs text-muted-foreground">სუპერ ადმინისტრატორი</p>
              </div>
              <div className="p-2 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Send className="w-4 h-4 text-accent" />
              </div>
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70 bg-muted/30 rounded-lg p-3">
            <Sparkles className="w-4 h-4 text-primary/60 flex-shrink-0" />
            <p>პროფილზე დაკლიკებით შეძლებთ პირადი შეტყობინების გაგზავნას</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
