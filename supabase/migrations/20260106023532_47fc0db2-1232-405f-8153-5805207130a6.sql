-- Add is_approved column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Update existing posts to be approved (so they don't disappear)
UPDATE public.posts SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_posts_is_approved ON public.posts(is_approved);