-- Add gif_url column to reel_comments table for GIF support
ALTER TABLE public.reel_comments ADD COLUMN IF NOT EXISTS gif_url TEXT;