-- Add music_start_time column to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS music_start_time integer DEFAULT 0;

-- Add music_artist column for lyrics lookup  
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS music_artist text;