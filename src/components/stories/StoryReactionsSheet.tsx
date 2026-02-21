import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { FB_REACTIONS, getStoryReactionEmoji } from './types';

interface Reaction {
  id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface StoryReactionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  onUserClick?: (userId: string) => void;
}

const StoryReactionsSheet = memo(function StoryReactionsSheet({
  isOpen,
  onClose,
  storyId,
  onUserClick
}: StoryReactionsSheetProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchReactions = useCallback(async () => {
    if (!storyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('story_reactions')
        .select('id, user_id, reaction_type, created_at')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setReactions(data.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id)
        })));
      } else {
        setReactions([]);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (isOpen) {
      fetchReactions();
    }
  }, [isOpen, fetchReactions]);

  // Get counts per reaction type
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredReactions = activeTab === 'all' 
    ? reactions 
    : reactions.filter(r => r.reaction_type === activeTab);

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
          className="absolute bottom-0 inset-x-0 max-h-[70vh] bg-card rounded-t-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <h3 className="font-semibold">რეაქციები ({reactions.length})</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-3 h-auto p-1 flex-wrap justify-start gap-1 bg-muted/50">
              <TabsTrigger value="all" className="text-xs px-3 py-1.5">
                ყველა ({reactions.length})
              </TabsTrigger>
              {FB_REACTIONS.map((reaction) => {
                const count = reactionCounts[reaction.type] || 0;
                if (count === 0) return null;
                return (
                  <TabsTrigger 
                    key={reaction.type} 
                    value={reaction.type}
                    className="text-xs px-2 py-1.5"
                  >
                    <span className="mr-1">{reaction.emoji}</span>
                    {count}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 overflow-y-auto p-4 mt-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredReactions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  ჯერ რეაქციები არ არის
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReactions.map((reaction) => (
                    <button
                      key={reaction.id}
                      onClick={() => {
                        onUserClick?.(reaction.user_id);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={reaction.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {reaction.profile?.username?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 text-base">
                          {getStoryReactionEmoji(reaction.reaction_type)}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{reaction.profile?.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reaction.created_at), { addSuffix: true, locale: ka })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default StoryReactionsSheet;
