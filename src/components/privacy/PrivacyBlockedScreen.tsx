import { Lock, ArrowLeft, UserX, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PrivacyBlockedScreenProps {
  reason: string;
  onBack?: () => void;
  variant?: 'profile' | 'message';
}

/**
 * Full-screen privacy block screen
 * Shows when user tries to access a restricted profile or messaging
 */
const PrivacyBlockedScreen = ({ reason, onBack, variant = 'profile' }: PrivacyBlockedScreenProps) => {
  const isMessageBlock = variant === 'message';
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="relative mb-6"
      >
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center border-2 border-border">
          {isMessageBlock ? (
            <ShieldAlert className="w-12 h-12 text-muted-foreground" />
          ) : (
            <Lock className="w-12 h-12 text-muted-foreground" />
          )}
        </div>
        {/* Small badge */}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
          <UserX className="w-4 h-4 text-destructive" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-bold mb-3"
      >
        {isMessageBlock ? 'მიმოწერა შეუძლებელია' : 'პროფილი დახურულია'}
      </motion.h2>

      {/* Reason */}
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground max-w-sm mb-8 leading-relaxed"
      >
        {reason}
      </motion.p>

      {/* Info card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-card/50 rounded-xl p-4 border border-border max-w-sm mb-8"
      >
        <p className="text-sm text-muted-foreground">
          {isMessageBlock 
            ? 'მომხმარებელმა შეზღუდა შეტყობინებების მიღება. შეგიძლიათ გაუგზავნოთ მეგობრობის მოთხოვნა.'
            : 'მომხმარებელს აქვს დაყენებული კონფიდენციალურობის პარამეტრები, რომლებიც ზღუდავს პროფილზე წვდომას.'
          }
        </p>
      </motion.div>

      {/* Back button */}
      {onBack && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button 
            onClick={onBack}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            დაბრუნება უკან
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PrivacyBlockedScreen;
