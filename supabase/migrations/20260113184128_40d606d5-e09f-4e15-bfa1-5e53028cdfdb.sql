-- Add parent_id column to reel_comments for replies
ALTER TABLE public.reel_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.reel_comments(id) ON DELETE CASCADE;

-- Add likes_count column for sorting
ALTER TABLE public.reel_comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Create reel_comment_reactions table
CREATE TABLE IF NOT EXISTS public.reel_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.reel_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.reel_comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reel_comment_reactions
CREATE POLICY "Anyone can view comment reactions"
ON public.reel_comment_reactions
FOR SELECT
USING (true);

CREATE POLICY "Users can add their own reactions"
ON public.reel_comment_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON public.reel_comment_reactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.reel_comment_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reel_comment_reactions_comment_id ON public.reel_comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_parent_id ON public.reel_comments(parent_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comment_reactions;