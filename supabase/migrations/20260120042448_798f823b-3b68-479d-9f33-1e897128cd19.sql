-- Add location fields to posts table for check-in feature
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_full text,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS location_source text CHECK (location_source IN ('manual', 'gps', 'provider')),
  ADD COLUMN IF NOT EXISTS hide_exact_location boolean DEFAULT true;

-- Create index for location-based searches
CREATE INDEX IF NOT EXISTS idx_posts_location_name ON public.posts(location_name);
CREATE INDEX IF NOT EXISTS idx_posts_location_full ON public.posts(location_full);