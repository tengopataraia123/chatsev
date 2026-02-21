-- Create post_shares table for tracking shares
CREATE TABLE public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  destination TEXT NOT NULL DEFAULT 'feed', -- 'feed', 'story', 'dm', 'external'
  platform TEXT, -- 'facebook', 'whatsapp', 'telegram', 'twitter', 'viber', 'email', 'copy', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view shares of posts they can see"
ON public.post_shares
FOR SELECT
USING (true);

CREATE POLICY "Users can share posts"
ON public.post_shares
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares"
ON public.post_shares
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX idx_post_shares_user_id ON public.post_shares(user_id);

-- Enable realtime for shares
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_shares;