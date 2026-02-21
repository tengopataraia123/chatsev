-- Add recording_url column to live_streams for saved recordings
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS recording_url TEXT DEFAULT NULL;

-- Add is_saved column to track if live was saved or deleted
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT NULL;