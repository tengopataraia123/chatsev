import { ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface MessageBlockedToastProps {
  show: boolean;
  reason: string;
  onClose: () => void;
}

/**
 * Toast/Banner component for when messaging is blocked
 * Shows a clear reason why messaging is not possible
 */
const MessageBlockedToast = ({ show, reason, onClose }: MessageBlockedToastProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-md"
        >
          <div className="bg-card border border-destructive/30 rounded-xl shadow-lg overflow-hidden">
            {/* Header bar */}
            <div className="bg-destructive/10 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                <span className="font-medium text-sm text-destructive">მიმოწერა შეუძლებელია</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                {reason}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MessageBlockedToast;
