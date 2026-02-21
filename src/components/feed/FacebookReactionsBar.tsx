import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getReactionEmoji, REACTION_TYPES } from '@/components/reactions/ReactionPicker';
import ReactionsModal from '@/components/reactions/ReactionsModal';

interface ReactionCount {
  reaction_type: string;
  count: number;
}

interface FacebookReactionsBarProps {
  itemId: string;
  itemType?: 'post' | 'activity' | 'poll' | 'video' | 'photo' | 'forum' | 'group_post';
  commentsCount: number;
  sharesCount?: number;
  onCommentsClick: () => void;
  onSharesClick?: () => void;
  onUserClick?: (userId: string) => void;
}

const FacebookReactionsBar = memo(({
  itemId,
  itemType = 'post',
  commentsCount,
  sharesCount = 0,
  onCommentsClick,
  onSharesClick,
  onUserClick
}: FacebookReactionsBarProps) => {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchReactions = useCallback(async () => {
    if (itemId.startsWith('group-')) {
      setReactions([]);
      return;
    }
    
    const { data } = await supabase
      .from('message_reactions')
      .select('reaction_type')
      .eq('message_id', itemId)
      .eq('message_type', itemType);

    if (!data) return;

    const counts = new Map<string, number>();
    data.forEach(r => {
      counts.set(r.reaction_type, (counts.get(r.reaction_type) || 0) + 1);
    });

    const reactionCounts: ReactionCount[] = [];
    counts.forEach((count, type) => {
      reactionCounts.push({ reaction_type: type, count });
    });

    setReactions(reactionCounts.sort((a, b) => b.count - a.count));
  }, [itemId, itemType]);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchReactions();
    }
  }, [fetchReactions]);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [itemId]);

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const topReactions = reactions.slice(0, 3);

  if (totalReactions === 0 && commentsCount === 0 && sharesCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {totalReactions > 0 && (
            <button
              onClick={() => setShowReactionsModal(true)}
              className="flex items-center gap-1.5 hover:underline"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{totalReactions}</span>
            </button>
          )}
          
          {commentsCount > 0 && (
            <button
              onClick={onCommentsClick}
              className="flex items-center gap-1.5 hover:underline"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{commentsCount}</span>
            </button>
          )}
          
          {sharesCount > 0 && (
            <button
              onClick={onSharesClick}
              className="flex items-center gap-1.5 hover:underline"
            >
              <Share2 className="w-4 h-4" />
              <span>{sharesCount}</span>
            </button>
          )}
        </div>

        {/* Right side - Stacked reaction emojis - no backgrounds/borders */}
        {topReactions.length > 0 && (
          <button
            onClick={() => setShowReactionsModal(true)}
            className="flex items-center hover:opacity-80"
          >
            <div className="flex -space-x-0.5">
              {topReactions.map((r, index) => (
                <motion.span
                  key={r.reaction_type}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="inline-flex items-center justify-center text-base"
                  style={{ zIndex: 3 - index }}
                >
                  {getReactionEmoji(r.reaction_type)}
                </motion.span>
              ))}
            </div>
          </button>
        )}
      </div>

      {showReactionsModal && createPortal(
        <ReactionsModal
          messageId={itemId}
          messageType={itemType}
          onClose={() => setShowReactionsModal(false)}
          onUserClick={onUserClick}
        />,
        document.body
      )}
    </>
  );
});

FacebookReactionsBar.displayName = 'FacebookReactionsBar';

export default FacebookReactionsBar;
