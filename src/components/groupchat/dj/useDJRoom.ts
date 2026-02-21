import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DJRoomState, DJRoom, DJTrack, DJQueueItem, DJRequest, DJ_ROOM_ID } from './types';

export function useDJRoom(userId?: string) {
  const [room, setRoom] = useState<DJRoom | null>(null);
  const [roomState, setRoomState] = useState<DJRoomState | null>(null);
  const [queue, setQueue] = useState<DJQueueItem[]>([]);
  const [requests, setRequests] = useState<DJRequest[]>([]);
  const [tracks, setTracks] = useState<DJTrack[]>([]);
  const [isDJ, setIsDJ] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState<number>(Date.now());

  const fetchRoom = useCallback(async () => {
    const { data } = await supabase
      .from('dj_rooms')
      .select('*')
      .eq('id', DJ_ROOM_ID)
      .single();
    
    if (data) {
      setRoom(data as DJRoom);
      if (userId) {
        setIsDJ(data.dj_user_id === userId || data.backup_dj_user_id === userId);
      }
    }
  }, [userId]);

  const fetchRoomState = useCallback(async () => {
    const { data } = await supabase
      .from('dj_room_state')
      .select('*')
      .eq('room_id', DJ_ROOM_ID)
      .single();
    
    if (data) {
      setRoomState(data as DJRoomState);
      setServerTime(Date.now());
    }
    setLoading(false);
  }, []);

  // Helper to check if string is a YouTube URL
  const isYoutubeUrl = useCallback((str: string): boolean => {
    return /youtube\.com|youtu\.be/.test(str);
  }, []);

  const fetchQueue = useCallback(async () => {
    const { data: queueData } = await supabase
      .from('dj_room_queue')
      .select('*, track:dj_room_tracks(*)')
      .eq('room_id', DJ_ROOM_ID)
      .order('position', { ascending: true });
    
    if (queueData) {
      // Fetch requester profiles for tracks
      const requesterIds = queueData
        .filter(q => q.track?.requested_by_user_id)
        .map(q => q.track.requested_by_user_id);
      
      let profileMap = new Map();
      if (requesterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', requesterIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      }
      
      setQueue(queueData.map(q => {
        let track = q.track as DJTrack;
        
        // If track title is a URL, display nicely
        if (track && isYoutubeUrl(track.title)) {
          const videoIdMatch = track.title.match(/(?:v=|\/live\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          const videoId = videoIdMatch ? videoIdMatch[1] : track.youtube_video_id;
          track = {
            ...track,
            title: 'YouTube Video',
            artist: track.artist || videoId || 'Unknown',
            requester_profile: track.requested_by_user_id ? profileMap.get(track.requested_by_user_id) : undefined
          };
        } else if (track && track.requested_by_user_id) {
          track = {
            ...track,
            requester_profile: profileMap.get(track.requested_by_user_id)
          };
        }
        
        return {
          ...q,
          track
        };
      }) as DJQueueItem[]);
    }
  }, [isYoutubeUrl]);

  // Helper to extract YouTube video ID
  const extractYoutubeId = useCallback((url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }, []);

  const fetchTracks = useCallback(async () => {
    const { data } = await supabase
      .from('dj_room_tracks')
      .select('*')
      .eq('room_id', DJ_ROOM_ID)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Find tracks with URLs as titles and update them
      const tracksToUpdate = data.filter(t => {
        const videoId = extractYoutubeId(t.title);
        return videoId !== null;
      });
      
      // Update tracks with proper titles (async, don't block)
      if (tracksToUpdate.length > 0) {
        tracksToUpdate.forEach(async (track) => {
          try {
            const { data: info } = await supabase.functions.invoke('youtube-info', {
              body: { url: track.title }
            });
            
            if (info && info.title) {
              await supabase
                .from('dj_room_tracks')
                .update({ 
                  title: info.title, 
                  artist: info.artist || info.channelName || track.artist 
                })
                .eq('id', track.id);
            }
          } catch (e) {
            console.error('Error updating track info:', e);
          }
        });
      }
      
      // Collect all user IDs (requesters + creators)
      const requesterIds = data
        .filter(t => t.requested_by_user_id)
        .map(t => t.requested_by_user_id);
      
      const creatorIds = data.map(t => t.created_by);
      
      // Combine unique user IDs
      const allUserIds = [...new Set([...requesterIds, ...creatorIds])];
      
      let profileMap = new Map();
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', allUserIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      }
      
      // Transform data - if title is still a URL, display nicely
      setTracks(data.map(t => {
        let title = t.title;
        let artist = t.artist;
        
        // If title looks like a URL, extract video ID for display
        const videoId = extractYoutubeId(title);
        if (videoId) {
          title = `YouTube Video`;
          artist = artist || videoId;
        }
        
        return {
          ...t,
          title,
          artist,
          requester_profile: t.requested_by_user_id ? profileMap.get(t.requested_by_user_id) : undefined,
          created_by_profile: profileMap.get(t.created_by) || undefined
        };
      }) as DJTrack[]);
    }
  }, [extractYoutubeId]);

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('dj_room_requests')
      .select('*')
      .eq('room_id', DJ_ROOM_ID)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (data) {
      const userIds = [...new Set(data.map(r => r.from_user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        setRequests(data.map(r => ({
          ...r,
          profile: profileMap.get(r.from_user_id)
        })) as DJRequest[]);
      } else {
        setRequests(data as DJRequest[]);
      }
    }
  }, []);

  const checkAdminStatus = useCallback(async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    const role = data?.role;
    setIsAdmin(role === 'admin' || role === 'super_admin' || role === 'moderator');
    if (role === 'admin' || role === 'super_admin' || role === 'moderator') {
      setIsDJ(true);
    }
  }, [userId]);

  // Playback controls (DJ only)
  const updatePlaybackState = useCallback(async (updates: Partial<DJRoomState>) => {
    if (!isDJ && !isAdmin) return;
    
    const { error } = await supabase
      .from('dj_room_state')
      .update({
        ...updates,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', DJ_ROOM_ID);
    
    if (error) {
      console.error('Error updating playback state:', error);
    }
  }, [isDJ, isAdmin, userId]);

  const play = useCallback(async () => {
    const startedAt = roomState?.paused_at || new Date().toISOString();
    await updatePlaybackState({
      paused: false,
      started_at: startedAt,
      paused_at: null
    });
  }, [updatePlaybackState, roomState]);

  const pause = useCallback(async () => {
    await updatePlaybackState({
      paused: true,
      paused_at: new Date().toISOString()
    });
  }, [updatePlaybackState]);

  const seek = useCallback(async (positionMs: number) => {
    await updatePlaybackState({
      seek_base_ms: positionMs,
      started_at: new Date().toISOString()
    });
  }, [updatePlaybackState]);

  const setSource = useCallback(async (track: DJTrack | null, youtubeVideoId?: string) => {
    if (track) {
      await updatePlaybackState({
        source_type: track.source_type,
        current_track_id: track.id,
        playback_url: track.url,
        youtube_video_id: track.youtube_video_id,
        started_at: new Date().toISOString(),
        paused: false,
        seek_base_ms: 0
      });
    } else if (youtubeVideoId) {
      await updatePlaybackState({
        source_type: 'youtube',
        current_track_id: null,
        playback_url: null,
        youtube_video_id: youtubeVideoId,
        started_at: new Date().toISOString(),
        paused: false,
        seek_base_ms: 0
      });
    }
  }, [updatePlaybackState]);

  const setMode = useCallback(async (mode: 'stream' | 'embed') => {
    await updatePlaybackState({ mode });
  }, [updatePlaybackState]);

  const stop = useCallback(async () => {
    await updatePlaybackState({
      current_track_id: null,
      playback_url: null,
      youtube_video_id: null,
      paused: true,
      started_at: null
    });
  }, [updatePlaybackState]);

  // Track management
  const addTrack = useCallback(async (track: Omit<DJTrack, 'id' | 'room_id' | 'created_at' | 'created_by'>) => {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from('dj_room_tracks')
      .insert({
        ...track,
        room_id: DJ_ROOM_ID,
        created_by: userId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding track:', error);
      return null;
    }
    
    await fetchTracks();
    return data as DJTrack;
  }, [userId, fetchTracks]);

  const addToQueue = useCallback(async (trackId: string, addToFirst: boolean = true): Promise<boolean> => {
    if (!userId) return false;
    
    if (addToFirst) {
      // Shift all existing positions up by 1
      const { data: currentQueue } = await supabase
        .from('dj_room_queue')
        .select('id, position')
        .eq('room_id', DJ_ROOM_ID)
        .order('position', { ascending: true });
      
      if (currentQueue && currentQueue.length > 0) {
        // Update all positions to shift them
        for (const item of currentQueue) {
          await supabase
            .from('dj_room_queue')
            .update({ position: item.position + 1 })
            .eq('id', item.id);
        }
      }
      
      // Insert new track at position 1
      const { error } = await supabase
        .from('dj_room_queue')
        .insert({
          room_id: DJ_ROOM_ID,
          track_id: trackId,
          position: 1,
          added_by: userId
        });
      
      if (error) {
        console.error('Error adding to queue:', error);
        return false;
      }
    } else {
      // Add to end (original behavior)
      const { data: currentQueue } = await supabase
        .from('dj_room_queue')
        .select('position')
        .eq('room_id', DJ_ROOM_ID)
        .order('position', { ascending: false })
        .limit(1);
      
      const maxPosition = currentQueue && currentQueue.length > 0 ? currentQueue[0].position : 0;
      
      const { error } = await supabase
        .from('dj_room_queue')
        .insert({
          room_id: DJ_ROOM_ID,
          track_id: trackId,
          position: maxPosition + 1,
          added_by: userId
        });
      
      if (error) {
        console.error('Error adding to queue:', error);
        return false;
      }
    }
    
    await fetchQueue();
    return true;
  }, [userId, fetchQueue]);

  const removeFromQueue = useCallback(async (queueItemId: string) => {
    await supabase
      .from('dj_room_queue')
      .delete()
      .eq('id', queueItemId);
    
    await fetchQueue();
  }, [fetchQueue]);

  // Request management
  // Submit request - DIRECTLY creates track and adds to queue, auto-plays if nothing is playing
  const submitRequest = useCallback(async (request: { song_title: string; artist?: string; youtube_link?: string; dedication?: string; message?: string }) => {
    console.log('[DJ] submitRequest called:', request);
    
    if (!userId) {
      console.error('[DJ] Not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    // Extract YouTube video ID from either youtube_link or song_title
    let youtubeVideoId: string | null = null;
    const urlToCheck = request.youtube_link || request.song_title;
    
    if (urlToCheck) {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
      ];
      for (const pattern of patterns) {
        const match = urlToCheck.match(pattern);
        if (match) {
          youtubeVideoId = match[1];
          console.log('[DJ] Extracted YouTube ID:', youtubeVideoId);
          break;
        }
      }
    }
    
    // 1. Create track DIRECTLY in dj_room_tracks
    console.log('[DJ] Creating track in dj_room_tracks...');
    const { data: newTrack, error: trackError } = await supabase
      .from('dj_room_tracks')
      .insert({
        room_id: DJ_ROOM_ID,
        title: request.song_title || 'YouTube Video',
        artist: request.artist || null,
        source_type: youtubeVideoId ? 'youtube' : 'stream',
        youtube_video_id: youtubeVideoId,
        url: request.youtube_link || null,
        dedication: request.dedication || null,
        requested_by_user_id: userId,
        created_by: userId,
        thumbnail_url: youtubeVideoId ? `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg` : null
      })
      .select()
      .single();
    
    if (trackError || !newTrack) {
      console.error('[DJ] Error creating track:', trackError);
      return { success: false, error: 'ტრეკის შექმნა ვერ მოხერხდა' };
    }
    
    console.log('[DJ] Track created:', newTrack.id);
    
    // 2. Add to queue at end
    const { data: currentQueue } = await supabase
      .from('dj_room_queue')
      .select('position')
      .eq('room_id', DJ_ROOM_ID)
      .order('position', { ascending: false })
      .limit(1);
    
    const maxPosition = currentQueue && currentQueue.length > 0 ? currentQueue[0].position : 0;
    
    console.log('[DJ] Adding to queue at position:', maxPosition + 1);
    const { error: queueError } = await supabase
      .from('dj_room_queue')
      .insert({
        room_id: DJ_ROOM_ID,
        track_id: newTrack.id,
        position: maxPosition + 1,
        added_by: userId
      });
    
    if (queueError) {
      console.error('[DJ] Error adding to queue:', queueError);
      return { success: false, error: 'რიგში დამატება ვერ მოხერხდა' };
    }
    
    console.log('[DJ] Added to queue successfully');
    
    // 3. Check if nothing is playing - if so, start playing immediately!
    const { data: currentState } = await supabase
      .from('dj_room_state')
      .select('current_track_id, paused')
      .eq('room_id', DJ_ROOM_ID)
      .single();
    
    console.log('[DJ] Current state:', currentState);
    
    const nothingPlaying = !currentState?.current_track_id || currentState.paused;
    
    if (nothingPlaying) {
      console.log('[DJ] Nothing playing, auto-starting track:', newTrack.title);
      
      // Start playing this track
      const { error: playError } = await supabase
        .from('dj_room_state')
        .update({
          current_track_id: newTrack.id,
          source_type: newTrack.source_type,
          youtube_video_id: youtubeVideoId,
          playback_url: newTrack.url,
          paused: false,
          started_at: new Date().toISOString(),
          seek_base_ms: 0,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', DJ_ROOM_ID);
      
      if (playError) {
        console.error('[DJ] Error starting playback:', playError);
      } else {
        console.log('[DJ] Playback started!');
        
        // Remove from queue since it's now playing
        await supabase
          .from('dj_room_queue')
          .delete()
          .eq('track_id', newTrack.id);
        console.log('[DJ] Removed from queue (now playing)');
      }
    } else {
      console.log('[DJ] Something is already playing, track added to queue');
    }
    
    // Refresh data
    await fetchQueue();
    await fetchTracks();
    
    return { success: true };
  }, [userId, fetchQueue, fetchTracks]);

  const handleRequest = useCallback(async (requestId: string, action: 'accepted' | 'rejected', rejectionReason?: string) => {
    if (!userId) return;
    
    await supabase
      .from('dj_room_requests')
      .update({
        status: action,
        rejection_reason: rejectionReason || null,
        handled_by: userId,
        handled_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    await fetchRequests();
  }, [userId, fetchRequests]);

  // Calculate current playback position
  const getCurrentPosition = useCallback(() => {
    if (!roomState || !roomState.started_at || roomState.paused) {
      return roomState?.seek_base_ms || 0;
    }
    
    const startedAt = new Date(roomState.started_at).getTime();
    const elapsed = serverTime - startedAt;
    return roomState.seek_base_ms + elapsed;
  }, [roomState, serverTime]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchRoom();
    fetchRoomState();
    fetchQueue();
    fetchTracks();
    fetchRequests();
    checkAdminStatus();
    
    const stateChannel = supabase
      .channel('dj-room-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_room_state', filter: `room_id=eq.${DJ_ROOM_ID}` }, () => {
        fetchRoomState();
      })
      .subscribe();
    
    const queueChannel = supabase
      .channel('dj-room-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_room_queue', filter: `room_id=eq.${DJ_ROOM_ID}` }, () => {
        fetchQueue();
      })
      .subscribe();
    
    const requestsChannel = supabase
      .channel('dj-room-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_room_requests', filter: `room_id=eq.${DJ_ROOM_ID}` }, () => {
        fetchRequests();
      })
      .subscribe();
    
    // Subscribe to tracks changes for real-time updates when new tracks are added
    const tracksChannel = supabase
      .channel('dj-room-tracks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_room_tracks', filter: `room_id=eq.${DJ_ROOM_ID}` }, () => {
        fetchTracks();
      })
      .subscribe();
    
    // Server time sync every second
    const syncInterval = setInterval(() => {
      setServerTime(Date.now());
    }, 1000);
    
    return () => {
      supabase.removeChannel(stateChannel);
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(tracksChannel);
      clearInterval(syncInterval);
    };
  }, [userId]);

  return {
    room,
    roomState,
    queue,
    requests,
    tracks,
    isDJ,
    isAdmin,
    loading,
    serverTime,
    // Actions
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
    getCurrentPosition,
    refreshTracks: fetchTracks,
    refreshQueue: fetchQueue,
    refreshRequests: fetchRequests
  };
}
