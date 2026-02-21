export interface DJRoomState {
  id: string;
  room_id: string;
  mode: 'stream' | 'embed';
  source_type: 'upload' | 'youtube' | null;
  current_track_id: string | null;
  playback_url: string | null;
  youtube_video_id: string | null;
  started_at: string | null;
  paused: boolean;
  paused_at: string | null;
  seek_base_ms: number;
  volume: number;
  updated_by: string | null;
  updated_at: string;
}

export interface DJRoom {
  id: string;
  name: string;
  owner_id: string;
  dj_user_id: string | null;
  backup_dj_user_id: string | null;
  is_live: boolean;
  listener_count: number;
}

export interface DJTrack {
  id: string;
  room_id: string;
  source_type: 'upload' | 'youtube';
  title: string;
  artist: string | null;
  url: string | null;
  youtube_video_id: string | null;
  thumbnail_url: string | null;
  duration_ms: number | null;
  created_by: string;
  created_at: string;
  requested_by_user_id: string | null;
  dedication: string | null;
  requester_profile?: {
    username: string;
    avatar_url: string | null;
  };
  created_by_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface DJQueueItem {
  id: string;
  room_id: string;
  track_id: string;
  position: number;
  status: 'queued' | 'playing' | 'done' | 'skipped';
  added_by: string;
  added_at: string;
  track?: DJTrack;
}

export interface DJRequest {
  id: string;
  room_id: string;
  from_user_id: string;
  song_title: string;
  artist: string | null;
  youtube_link: string | null;
  dedication: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'played';
  rejection_reason: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export const DJ_ROOM_ID = '00000000-0000-0000-0000-000000000001';
