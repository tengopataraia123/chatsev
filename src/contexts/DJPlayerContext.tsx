import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DJ_ROOM_ID = '00000000-0000-0000-0000-000000000001';

interface DJRoomState {
  id: string;
  room_id: string;
  mode: string;
  source_type: string | null;
  current_track_id: string | null;
  playback_url: string | null;
  youtube_video_id: string | null;
  started_at: string | null;
  paused: boolean;
  paused_at: string | null;
  seek_base_ms: number;
  volume: number;
  updated_by: string | null;
  updated_at: string | null;
}

interface DJTrack {
  id: string;
  title: string;
  artist: string | null;
}

interface DJPlayerContextType {
  isInDJRoom: boolean;
  setIsInDJRoom: (inRoom: boolean) => void;
  roomState: DJRoomState | null;
  tracks: DJTrack[];
}

const DJPlayerContext = createContext<DJPlayerContextType>({
  isInDJRoom: false,
  setIsInDJRoom: () => {},
  roomState: null,
  tracks: []
});

export const useDJPlayerContext = () => useContext(DJPlayerContext);

export const DJPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInDJRoom, setIsInDJRoom] = useState(false);
  const [roomState, setRoomState] = useState<DJRoomState | null>(null);
  const [tracks, setTracks] = useState<DJTrack[]>([]);

  // Fetch room state
  useEffect(() => {
    const fetchState = async () => {
      const { data } = await supabase
        .from('dj_room_state')
        .select('*')
        .eq('room_id', DJ_ROOM_ID)
        .single();
      
      if (data) setRoomState(data as DJRoomState);
    };

    const fetchTracks = async () => {
      const { data } = await supabase
        .from('dj_room_tracks')
        .select('id, title, artist')
        .eq('room_id', DJ_ROOM_ID);
      
      if (data) setTracks(data as DJTrack[]);
    };

    fetchState();
    fetchTracks();
    
    // Throttled realtime subscription for DJ state
    let debounceTimer: NodeJS.Timeout | null = null;
    const channel = supabase
      .channel('dj-global-state')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'dj_room_state', 
        filter: `room_id=eq.${DJ_ROOM_ID}` 
      }, () => {
        // Debounce state updates
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchState, 1000);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <DJPlayerContext.Provider value={{
      isInDJRoom,
      setIsInDJRoom,
      roomState,
      tracks
    }}>
      {children}
    </DJPlayerContext.Provider>
  );
};

export default DJPlayerContext;
