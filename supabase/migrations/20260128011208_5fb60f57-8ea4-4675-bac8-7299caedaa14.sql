-- DJ Room Settings table for per-room configuration
CREATE TABLE IF NOT EXISTS public.dj_room_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.dj_rooms(id) ON DELETE CASCADE,
  max_queue_per_user INTEGER DEFAULT 3,
  fallback_enabled BOOLEAN DEFAULT true,
  autoplay_enabled BOOLEAN DEFAULT true,
  round_robin_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id)
);

-- Fallback playlist table
CREATE TABLE IF NOT EXISTS public.dj_fallback_playlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.dj_rooms(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  thumbnail_url TEXT,
  duration_ms INTEGER,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Play history table for logging
CREATE TABLE IF NOT EXISTS public.dj_play_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.dj_rooms(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.dj_room_tracks(id) ON DELETE SET NULL,
  youtube_video_id TEXT,
  title TEXT NOT NULL,
  artist TEXT,
  requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ DEFAULT now(),
  duration_ms INTEGER,
  skip_reason TEXT
);

-- User queue stats for tracking user contributions
CREATE TABLE IF NOT EXISTS public.dj_user_queue_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.dj_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_queue_count INTEGER DEFAULT 0,
  total_played INTEGER DEFAULT 0,
  last_added_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- Track reactions (likes/dislikes)
CREATE TABLE IF NOT EXISTS public.dj_track_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.dj_rooms(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.dj_room_tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, track_id, user_id)
);

-- Add round_robin_position to track ordering
ALTER TABLE public.dj_room_queue 
ADD COLUMN IF NOT EXISTS round_robin_position INTEGER DEFAULT 0;

-- Add likes/dislikes count to tracks
ALTER TABLE public.dj_room_tracks 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.dj_room_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_fallback_playlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_play_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_user_queue_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_track_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings (admin only)
CREATE POLICY "Anyone can view DJ settings" ON public.dj_room_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage DJ settings" ON public.dj_room_settings 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for fallback playlist
CREATE POLICY "Anyone can view fallback playlist" ON public.dj_fallback_playlist FOR SELECT USING (true);
CREATE POLICY "Admins can manage fallback playlist" ON public.dj_fallback_playlist 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for play history  
CREATE POLICY "Anyone can view play history" ON public.dj_play_history FOR SELECT USING (true);
CREATE POLICY "System can insert play history" ON public.dj_play_history 
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user queue stats
CREATE POLICY "Anyone can view queue stats" ON public.dj_user_queue_stats FOR SELECT USING (true);
CREATE POLICY "Users can manage own stats" ON public.dj_user_queue_stats 
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reactions
CREATE POLICY "Anyone can view reactions" ON public.dj_track_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own reactions" ON public.dj_track_reactions 
  FOR ALL USING (auth.uid() = user_id);

-- Insert default settings for main DJ room
INSERT INTO public.dj_room_settings (room_id, max_queue_per_user, fallback_enabled, autoplay_enabled, round_robin_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', 3, true, true, true)
ON CONFLICT (room_id) DO NOTHING;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_play_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_track_reactions;