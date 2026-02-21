-- Add requester info to tracks table
ALTER TABLE public.dj_room_tracks 
ADD COLUMN IF NOT EXISTS requested_by_user_id UUID,
ADD COLUMN IF NOT EXISTS dedication TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dj_room_tracks_requested_by ON public.dj_room_tracks(requested_by_user_id);