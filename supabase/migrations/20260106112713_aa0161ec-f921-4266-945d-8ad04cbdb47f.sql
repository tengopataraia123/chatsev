-- Add shortcode column to gifs table
ALTER TABLE public.gifs ADD COLUMN IF NOT EXISTS shortcode text UNIQUE;

-- Create index for fast shortcode lookups
CREATE INDEX IF NOT EXISTS idx_gifs_shortcode ON public.gifs (shortcode) WHERE shortcode IS NOT NULL;