-- Add share_text column to post_shares for storing user's comment on shared posts
ALTER TABLE public.post_shares 
ADD COLUMN IF NOT EXISTS share_text TEXT;

-- Add index for faster feed queries
CREATE INDEX IF NOT EXISTS idx_post_shares_feed 
ON public.post_shares(user_id, destination, created_at DESC) 
WHERE destination = 'feed';