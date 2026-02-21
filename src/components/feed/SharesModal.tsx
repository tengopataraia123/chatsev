import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface ShareUser {
  id: string;
  user_id: string;
  destination: string;
  platform: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface SharesModalProps {
  postId: string;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
}

const getShareLabel = (destination: string, platform?: string | null) => {
  if (destination === 'feed') return 'ფიდში';
  if (destination === 'story') return 'სტორიში';
  if (destination === 'dm') return 'შეტყობინებით';
  if (platform) {
    const platformLabels: Record<string, string> = {
      facebook: 'Facebook',
      messenger: 'Messenger',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      twitter: 'X',
      viber: 'Viber',
      email: 'Email',
      copy: 'ბმულის კოპირება',
      native: 'გაზიარება'
    };
    return platformLabels[platform] || platform;
  }
  return 'გაზიარება';
};

const SharesModal = ({ postId, onClose, onUserClick }: SharesModalProps) => {
  const [shares, setShares] = useState<ShareUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShares();
  }, [postId]);

  const fetchShares = async () => {
    // Skip for group posts
    if (postId.startsWith('group-')) {
      setShares([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('post_shares')
        .select('id, user_id, destination, platform, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setShares([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const sharesWithProfiles = data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id)
      }));

      setShares(sharesWithProfiles);
    } catch (error) {
      console.error('Error fetching shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    onClose();
    onUserClick?.(userId);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card w-full max-w-md rounded-2xl max-h-[70vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-lg">გაზიარებები</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              გაზიარებები არ არის
            </div>
          ) : (
            <div className="space-y-1">
              {shares.map((share, index) => (
                <motion.button
                  key={share.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleUserClick(share.user_id)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={share.profile?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback>
                      {share.profile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">
                      {share.profile?.username || 'მომხმარებელი'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getShareLabel(share.destination, share.platform)} · {formatDistanceToNow(new Date(share.created_at), { addSuffix: false, locale: ka }).replace(/^დაახლოებით\s*/i, '')} წინ
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SharesModal;
