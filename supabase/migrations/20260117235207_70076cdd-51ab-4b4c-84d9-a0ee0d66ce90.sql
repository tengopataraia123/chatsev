
-- Create dj_rooms table for room configuration
CREATE TABLE IF NOT EXISTS public.dj_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'DJ Room',
  owner_id UUID NOT NULL,
  dj_user_id UUID,
  backup_dj_user_id UUID,
  is_live BOOLEAN DEFAULT FALSE,
  listener_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create dj_room_state for playback synchronization
CREATE TABLE IF NOT EXISTS public.dj_room_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'embed' CHECK (mode IN ('stream', 'embed')),
  source_type TEXT CHECK (source_type IN ('upload', 'youtube', NULL)),
  current_track_id UUID,
  playback_url TEXT,
  youtube_video_id TEXT,
  started_at TIMESTAMPTZ,
  paused BOOLEAN DEFAULT TRUE,
  paused_at TIMESTAMPTZ,
  seek_base_ms INTEGER DEFAULT 0,
  volume INTEGER DEFAULT 80,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create dj_room_tracks for uploaded/added tracks
CREATE TABLE IF NOT EXISTS public.dj_room_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'youtube')),
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration_ms INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create dj_room_queue for play queue
CREATE TABLE IF NOT EXISTS public.dj_room_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.dj_room_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'playing', 'done', 'skipped')),
  added_by UUID NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Drop and recreate dj_room_requests with proper structure
DROP TABLE IF EXISTS public.dj_room_requests CASCADE;

CREATE TABLE public.dj_room_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT,
  youtube_link TEXT,
  dedication TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'played')),
  rejection_reason TEXT,
  handled_by UUID,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for rate limiting
CREATE INDEX idx_dj_room_requests_rate_limit ON public.dj_room_requests(from_user_id, created_at);
CREATE INDEX idx_dj_room_requests_room ON public.dj_room_requests(room_id, status);
CREATE INDEX idx_dj_room_queue_room ON public.dj_room_queue(room_id, position);
CREATE INDEX idx_dj_room_tracks_room ON public.dj_room_tracks(room_id);

-- Enable RLS
ALTER TABLE public.dj_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_room_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_room_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_room_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_room_requests ENABLE ROW LEVEL SECURITY;

-- RLS for dj_rooms
CREATE POLICY "Anyone can view dj_rooms" ON public.dj_rooms FOR SELECT USING (true);
CREATE POLICY "Admin can manage dj_rooms" ON public.dj_rooms FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS for dj_room_state
CREATE POLICY "Anyone can view room state" ON public.dj_room_state FOR SELECT USING (true);
CREATE POLICY "DJ can update room state" ON public.dj_room_state FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.dj_rooms WHERE id = room_id AND (dj_user_id = auth.uid() OR backup_dj_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admin can insert room state" ON public.dj_room_state FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for dj_room_tracks
CREATE POLICY "Anyone can view tracks" ON public.dj_room_tracks FOR SELECT USING (true);
CREATE POLICY "DJ can manage tracks" ON public.dj_room_tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.dj_rooms WHERE id = room_id AND (dj_user_id = auth.uid() OR backup_dj_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "DJ can delete tracks" ON public.dj_room_tracks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.dj_rooms WHERE id = room_id AND (dj_user_id = auth.uid() OR backup_dj_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS for dj_room_queue
CREATE POLICY "Anyone can view queue" ON public.dj_room_queue FOR SELECT USING (true);
CREATE POLICY "DJ can manage queue" ON public.dj_room_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dj_rooms WHERE id = room_id AND (dj_user_id = auth.uid() OR backup_dj_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS for dj_room_requests
CREATE POLICY "Anyone can view requests" ON public.dj_room_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create requests" ON public.dj_room_requests FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "DJ can update requests" ON public.dj_room_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.dj_rooms WHERE id = room_id AND (dj_user_id = auth.uid() OR backup_dj_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_room_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_room_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_room_requests;

-- Create default DJ room
INSERT INTO public.dj_rooms (id, name, owner_id) 
VALUES ('00000000-0000-0000-0000-000000000001', 'DJ Room', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- Create default room state
INSERT INTO public.dj_room_state (room_id, mode, paused) 
VALUES ('00000000-0000-0000-0000-000000000001', 'embed', true)
ON CONFLICT (room_id) DO NOTHING;

-- Function to check if user is DJ
CREATE OR REPLACE FUNCTION public.is_room_dj(_room_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dj_rooms
    WHERE id = _room_id 
    AND (dj_user_id = _user_id OR backup_dj_user_id = _user_id)
  ) OR public.has_role(_user_id, 'admin');
$$;

-- Function to check request rate limit (1 per 2 minutes)
CREATE OR REPLACE FUNCTION public.can_submit_dj_request(_user_id UUID, _room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.dj_room_requests
    WHERE from_user_id = _user_id 
    AND room_id = _room_id
    AND created_at > now() - INTERVAL '2 minutes'
  );
$$;
