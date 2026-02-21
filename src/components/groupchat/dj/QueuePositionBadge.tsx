import { memo, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DJ_ROOM_ID } from './types';

interface QueuePositionBadgeProps {
  userId?: string;
}

const QueuePositionBadge = memo(({ userId }: QueuePositionBadgeProps) => {
  const [position, setPosition] = useState<number | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [totalQueue, setTotalQueue] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const checkPosition = async () => {
      try {
        // Get queue items with track info in one query
        const { data: queueItems, error: queueError } = await supabase
          .from('dj_room_queue')
          .select(`
            id,
            position,
            track:dj_room_tracks!inner (
              id,
              requested_by_user_id
            )
          `)
          .eq('room_id', DJ_ROOM_ID)
          .eq('status', 'queued')
          .order('position', { ascending: true });

        if (queueError) {
          console.error('Queue fetch error:', queueError);
          setPosition(null);
          setTotalQueue(0);
          return;
        }

        const queueCount = queueItems?.length || 0;
        setTotalQueue(queueCount);

        if (queueCount === 0) {
          setPosition(null);
        } else {
          // Find user's position in the sorted queue (1-indexed)
          let userPosition: number | null = null;
          for (let i = 0; i < queueItems.length; i++) {
            const track = queueItems[i].track as { id: string; requested_by_user_id: string | null } | null;
            if (track && track.requested_by_user_id === userId) {
              userPosition = i + 1; // 1-indexed position
              break;
            }
          }
          setPosition(userPosition);
        }

        // Check for pending requests
        const { data: pendingRequests, error: reqError } = await supabase
          .from('dj_room_requests')
          .select('id')
          .eq('room_id', DJ_ROOM_ID)
          .eq('status', 'pending')
          .eq('from_user_id', userId);

        if (reqError) {
          console.error('Requests fetch error:', reqError);
          setHasPending(false);
          return;
        }

        setHasPending((pendingRequests?.length || 0) > 0);
      } catch (error) {
        console.error('QueuePositionBadge error:', error);
        setPosition(null);
        setHasPending(false);
        setTotalQueue(0);
      }
    };

    checkPosition();

    // Subscribe to queue changes
    const queueChannel = supabase
      .channel(`queue-position-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_room_queue' }, checkPosition)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_room_requests' }, checkPosition)
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
    };
  }, [userId]);

  if (!userId) return null;
  if (!position && !hasPending) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
      {hasPending && (
        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
          <Clock className="w-3 h-3 mr-1" />
          მოლოდინში...
        </Badge>
      )}
      
      {position && totalQueue > 0 && (
        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
          <Music className="w-3 h-3 mr-1" />
          თქვენ ხართ რიგში #{position} ({totalQueue} სულ)
        </Badge>
      )}
    </div>
  );
});

QueuePositionBadge.displayName = 'QueuePositionBadge';

export default QueuePositionBadge;
