import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface Viewer {
  id: string;
  user_id: string;
  viewed_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface StoryViewersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  onUserClick?: (userId: string) => void;
}

const StoryViewersSheet = memo(function StoryViewersSheet({
  isOpen,
  onClose,
  storyId,
  onUserClick
}: StoryViewersSheetProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViewers = useCallback(async () => {
    if (!storyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select('id, user_id, viewed_at')
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setViewers(data.map(v => ({
          ...v,
          profile: profileMap.get(v.user_id)
        })));
      } else {
        setViewers([]);
      }
    } catch (error) {
      console.error('Error fetching viewers:', error);
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (isOpen) {
      fetchViewers();
    }
  }, [isOpen, fetchViewers]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 inset-x-0 max-h-[60vh] bg-card rounded-t-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">ნახვები ({viewers.length})</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewers list */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : viewers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                ჯერ არავის უნახავს
              </div>
            ) : (
              <div className="space-y-3">
                {viewers.map((viewer) => (
                  <button
                    key={viewer.id}
                    onClick={() => {
                      onUserClick?.(viewer.user_id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={viewer.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {viewer.profile?.username?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{viewer.profile?.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true, locale: ka })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default StoryViewersSheet;
