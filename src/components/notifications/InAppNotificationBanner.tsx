import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface InAppNotification {
  id: string;
  type: 'message' | 'messenger' | 'call';
  senderName: string;
  senderAvatar: string | null;
  content: string;
  conversationId?: string;
  timestamp: number;
}

interface InAppNotificationBannerProps {
  onTap?: (notification: InAppNotification) => void;
}

const DISPLAY_DURATION = 4000;

const InAppNotificationBanner = memo(({ onTap }: InAppNotificationBannerProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const timer = dismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.current.delete(id);
    }
  }, []);

  const addNotification = useCallback((notif: InAppNotification) => {
    setNotifications(prev => {
      // Max 3 visible at once
      const next = [notif, ...prev].slice(0, 3);
      return next;
    });

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      dismissNotification(notif.id);
    }, DISPLAY_DURATION);
    dismissTimers.current.set(notif.id, timer);
  }, [dismissNotification]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`in-app-notif-${user.id}`)
      // Private messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', msg.sender_id)
            .maybeSingle();

          addNotification({
            id: `pm-${msg.id}`,
            type: 'message',
            senderName: profile?.username || 'მომხმარებელი',
            senderAvatar: profile?.avatar_url || null,
            content: msg.content?.substring(0, 80) || '📷 მედია',
            conversationId: msg.conversation_id,
            timestamp: Date.now(),
          });
        }
      )
      // Messenger messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messenger_messages' },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', msg.sender_id)
            .maybeSingle();

          addNotification({
            id: `mm-${msg.id}`,
            type: 'messenger',
            senderName: profile?.username || 'მომხმარებელი',
            senderAvatar: profile?.avatar_url || null,
            content: msg.content?.substring(0, 80) || '📷 მედია',
            conversationId: msg.conversation_id,
            timestamp: Date.now(),
          });
        }
      )
      // Calls
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls' },
        async (payload) => {
          const call = payload.new as any;
          if (call.caller_id === user.id) return;
          if (call.receiver_id !== user.id) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', call.caller_id)
            .maybeSingle();

          addNotification({
            id: `call-${call.id}`,
            type: 'call',
            senderName: profile?.username || 'მომხმარებელი',
            senderAvatar: profile?.avatar_url || null,
            content: call.call_type === 'video' ? '📹 ვიდეო ზარი' : '📞 ხმოვანი ზარი',
            timestamp: Date.now(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      dismissTimers.current.forEach(timer => clearTimeout(timer));
      dismissTimers.current.clear();
    };
  }, [user?.id, addNotification]);

  const handleTap = (notif: InAppNotification) => {
    dismissNotification(notif.id);
    onTap?.(notif);
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[200] pointer-events-none flex flex-col items-center gap-2 pt-2"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ y: -80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto w-[calc(100%-24px)] max-w-md mx-3"
          >
            <div 
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl shadow-2xl cursor-pointer",
                "bg-card/95 backdrop-blur-xl border border-border/50",
                "active:scale-[0.98] transition-transform"
              )}
              onClick={() => handleTap(notif)}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {notif.senderAvatar ? (
                  <img 
                    src={notif.senderAvatar} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {notif.senderName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Type badge */}
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card",
                  notif.type === 'call' ? 'bg-online' : 'bg-primary'
                )}>
                  {notif.type === 'call' ? (
                    <Phone className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <MessageCircle className="w-2.5 h-2.5 text-white" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {notif.senderName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {notif.content}
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(notif.id);
                }}
                className="flex-shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

InAppNotificationBanner.displayName = 'InAppNotificationBanner';

export default InAppNotificationBanner;
