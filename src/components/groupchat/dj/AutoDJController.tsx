import { memo, useEffect, useCallback, useRef, useState } from 'react';
import { Bot, Play, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJRoomState, DJQueueItem, DJRequest } from './types';

const STORAGE_KEY = 'auto_dj_enabled';
const DJ_ROOM_ID = '00000000-0000-0000-0000-000000000001';

interface AutoDJControllerProps {
  roomState: DJRoomState | null;
  queue: DJQueueItem[];
  requests: DJRequest[];
  isAdmin: boolean;
  onPlayNext: () => void;
}

const AutoDJController = memo(({ 
  roomState, 
  queue, 
  requests, 
  isAdmin,
  onPlayNext 
}: AutoDJControllerProps) => {
  // DJ Lolita is ALWAYS active - no toggle needed
  const autoDJEnabled = true;
  const { toast } = useToast();
  const playingRef = useRef(false);
  const lastCheckRef = useRef(0);

  // Play next track from queue - fetches fresh data from DB
  const playNext = useCallback(async () => {
    if (playingRef.current) {
      console.log('[AutoDJ] Already playing, skipping...');
      return;
    }
    
    // Prevent rapid fire
    const now = Date.now();
    if (now - lastCheckRef.current < 2000) {
      console.log('[AutoDJ] Rate limited, skipping...');
      return;
    }
    lastCheckRef.current = now;
    playingRef.current = true;
    
    try {
      console.log('[AutoDJ] Checking for next track to play...');
      
      // Get fresh state from DB
      const { data: freshState } = await supabase
        .from('dj_room_state')
        .select('current_track_id, paused')
        .eq('room_id', DJ_ROOM_ID)
        .single();
      
      // If something is already playing, don't do anything
      if (freshState?.current_track_id && !freshState.paused) {
        console.log('[AutoDJ] Something already playing, skipping');
        return;
      }
      
      // Get next track from queue
      const { data: nextQueueItem } = await supabase
        .from('dj_room_queue')
        .select('*, track:dj_room_tracks(*)')
        .eq('room_id', DJ_ROOM_ID)
        .order('position', { ascending: true })
        .limit(1)
        .single();
      
      if (nextQueueItem?.track) {
        const track = nextQueueItem.track;
        console.log('[AutoDJ] Playing next track:', track.title);
        
        // Start playing
        const { error: updateError } = await supabase
          .from('dj_room_state')
          .update({
            current_track_id: track.id,
            source_type: track.source_type,
            youtube_video_id: track.youtube_video_id,
            playback_url: track.url,
            paused: false,
            started_at: new Date().toISOString(),
            seek_base_ms: 0,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', DJ_ROOM_ID);
        
        if (updateError) {
          console.error('[AutoDJ] Error updating state:', updateError);
          return;
        }
        
        // Remove from queue
        await supabase
          .from('dj_room_queue')
          .delete()
          .eq('id', nextQueueItem.id);
        
        console.log('[AutoDJ] Track started successfully!');
        toast({ title: `🎵 ${track.title}` });
      } else {
        console.log('[AutoDJ] Queue is empty');
      }
    } catch (e) {
      console.error('[AutoDJ] Error:', e);
    } finally {
      playingRef.current = false;
    }
  }, [toast]);

  // No need to save - always active

  // Auto-play when nothing is playing and queue has items - react to changes
  useEffect(() => {
    if (!autoDJEnabled) return;
    
    const hasTrack = !!roomState?.current_track_id;
    const isPaused = roomState?.paused;
    const nothingPlaying = !hasTrack || isPaused;
    
    if (nothingPlaying && queue.length > 0) {
      console.log('[AutoDJ] Detected: nothing playing + queue has items');
      // Small delay to prevent race conditions
      const timeout = setTimeout(() => {
        playNext();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [autoDJEnabled, roomState?.current_track_id, roomState?.paused, queue.length, playNext]);

  // Periodic check every 3 seconds as backup
  useEffect(() => {
    if (!autoDJEnabled) return;
    
    const interval = setInterval(async () => {
      // Fetch fresh state to avoid stale data
      const { data: freshState } = await supabase
        .from('dj_room_state')
        .select('current_track_id, paused')
        .eq('room_id', DJ_ROOM_ID)
        .single();
      
      const { data: freshQueue } = await supabase
        .from('dj_room_queue')
        .select('id')
        .eq('room_id', DJ_ROOM_ID)
        .limit(1);
      
      const nothingPlaying = !freshState?.current_track_id || freshState.paused;
      const hasQueue = freshQueue && freshQueue.length > 0;
      
      if (nothingPlaying && hasQueue) {
        console.log('[AutoDJ] Periodic check: nothing playing, queue has items');
        playNext();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [autoDJEnabled, playNext]);

  if (!isAdmin) return null;

  // DJ Lolita runs silently in the background - no UI needed for admins
  // It automatically plays next track when queue has items
  return null;
});

AutoDJController.displayName = 'AutoDJController';

export default AutoDJController;
