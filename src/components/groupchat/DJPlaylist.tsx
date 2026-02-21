import { memo, useEffect, useState, useCallback } from 'react';
import { DJPanel, DJRequestForm, DJPlayer, DJHistory, DJTrack, useDJRoom } from './dj';
import { useDJPlayerContext } from '@/contexts/DJPlayerContext';
import AutoDJController from './dj/AutoDJController';
import AutoDJMonitor from './dj/AutoDJMonitor';
import QueuePositionBadge from './dj/QueuePositionBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DJPlaylistProps {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  userId?: string;
}

const DJPlaylist = memo(({ isSuperAdmin, isAdmin, userId }: DJPlaylistProps) => {
  const { setIsInDJRoom } = useDJPlayerContext();
  const [listenerSelectedTrack, setListenerSelectedTrack] = useState<DJTrack | null>(null);
  const { toast } = useToast();
  
  const {
    roomState,
    queue,
    requests,
    tracks,
    isDJ,
    serverTime,
    play,
    pause,
    seek,
    setSource,
    setMode,
    stop,
    addTrack,
    addToQueue,
    removeFromQueue,
    submitRequest,
    handleRequest,
    getCurrentPosition
  } = useDJRoom(userId);

  // Notify context that we're in DJ room
  useEffect(() => {
    setIsInDJRoom(true);
    return () => setIsInDJRoom(false);
  }, [setIsInDJRoom]);

  const currentTrack = tracks.find(t => t.id === roomState?.current_track_id);
  
  // Handler for listener to play a past track
  const handleListenerPlayTrack = useCallback((track: DJTrack) => {
    setListenerSelectedTrack(track);
  }, []);
  
  // Handler to go back to live
  const handleGoToLive = useCallback(() => {
    setListenerSelectedTrack(null);
  }, []);

  const isListener = !isDJ && !isAdmin;

  // Handler for Auto-DJ to play next
  const handlePlayNext = useCallback(async () => {
    if (queue.length > 0 && queue[0].track) {
      await setSource(queue[0].track);
      await removeFromQueue(queue[0].id);
    }
  }, [queue, setSource, removeFromQueue]);

  // Handler for when track ends - immediately play next from queue
  const handleTrackEnded = useCallback(async () => {
    console.log('[DJPlaylist] Track ended, attempting to play next...');
    
    const DJ_ROOM_ID = '00000000-0000-0000-0000-000000000001';
    
    try {
      // Get next track from queue
      const { data: nextQueueItem, error: queueError } = await supabase
        .from('dj_room_queue')
        .select('*, track:dj_room_tracks(*)')
        .eq('room_id', DJ_ROOM_ID)
        .order('position', { ascending: true })
        .limit(1)
        .single();
      
      console.log('[DJPlaylist] Next queue item:', nextQueueItem, 'Error:', queueError);
      
      if (nextQueueItem?.track) {
        const track = nextQueueItem.track;
        console.log('[DJPlaylist] Playing next track:', track.title);
        
        // Start playing this track
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
          console.error('[DJPlaylist] Error updating state:', updateError);
          return;
        }
        
        // Remove from queue
        await supabase
          .from('dj_room_queue')
          .delete()
          .eq('id', nextQueueItem.id);
        
        console.log('[DJPlaylist] Track started, removed from queue');
        toast({ title: `🎵 ${track.title}` });
      } else {
        console.log('[DJPlaylist] Queue is empty, stopping playback');
        
        // Clear the current track
        await supabase
          .from('dj_room_state')
          .update({
            current_track_id: null,
            youtube_video_id: null,
            playback_url: null,
            source_type: null,
            started_at: null,
            paused: true,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', DJ_ROOM_ID);
      }
    } catch (e) {
      console.error('[DJPlaylist] Error playing next:', e);
      
      // On error, just clear
      await supabase
        .from('dj_room_state')
        .update({
          current_track_id: null,
          youtube_video_id: null,
          playback_url: null,
          paused: true,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', DJ_ROOM_ID);
    }
  }, [toast]);

  return (
    <div className="border-b border-border">
      {/* Queue position badge for listeners */}
      {isListener && <QueuePositionBadge userId={userId} />}
      
      {/* DJ Player - always visible when there's active playback */}
      <DJPlayer
        roomState={roomState}
        currentTrack={listenerSelectedTrack || currentTrack}
        serverTime={serverTime}
        isDJ={isDJ || isAdmin}
        onSeek={seek}
        listenerOverrideTrack={isListener ? listenerSelectedTrack : null}
        onGoToLive={isListener ? handleGoToLive : undefined}
        onTrackEnded={handleTrackEnded}
      />
      
      {/* Auto-DJ Controller and Monitor (only for Admin) */}
      {(isDJ || isAdmin) && (
        <div className="p-2 space-y-2">
          <AutoDJController
            roomState={roomState}
            queue={queue}
            requests={requests}
            isAdmin={isDJ || isAdmin}
            onPlayNext={handlePlayNext}
          />
          <AutoDJMonitor
            queue={queue}
            requests={requests}
            isAdmin={isDJ || isAdmin}
          />
        </div>
      )}
      
      {/* DJ Panel (only for DJ/Admin) */}
      {(isDJ || isAdmin) && (
        <DJPanel
          roomState={roomState}
          queue={queue}
          tracks={tracks}
          requests={requests}
          currentPosition={getCurrentPosition()}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onStop={stop}
          onSetSource={setSource}
          onSetMode={setMode}
          onAddTrack={addTrack}
          onAddToQueue={addToQueue}
          onRemoveFromQueue={removeFromQueue}
          onHandleRequest={handleRequest}
        />
      )}
      
      {/* Request Form - for ALL users (admins can also request songs) */}
      <DJRequestForm onSubmit={submitRequest} />
      
      {/* History for all users - shows past songs with requester info */}
      <DJHistory 
        tracks={tracks} 
        onPlayTrack={isDJ || isAdmin ? setSource : handleListenerPlayTrack}
        canPlay={true}
        isDJ={isDJ || isAdmin}
      />
    </div>
  );
});

DJPlaylist.displayName = 'DJPlaylist';

export default DJPlaylist;
