-- Add metadata column to posts for storing structured data like bet shares
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Add post_type column to identify different types of posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'regular';

-- Add index for faster queries by post_type
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);

-- Comment for documentation
COMMENT ON COLUMN public.posts.metadata IS 'JSON metadata for special post types like bet shares, horoscopes, etc.';
COMMENT ON COLUMN public.posts.post_type IS 'Type of post: regular, bet_share, horoscope, mood, etc.';