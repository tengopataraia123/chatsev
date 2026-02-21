-- Create activity_likes table for likes on activities
CREATE TABLE IF NOT EXISTS public.activity_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, user_id)
);

-- Create activity_comments table for comments on activities
CREATE TABLE IF NOT EXISTS public.activity_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_likes
CREATE POLICY "Anyone can view activity likes" ON public.activity_likes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like activities" ON public.activity_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" ON public.activity_likes
FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for activity_comments
CREATE POLICY "Anyone can view activity comments" ON public.activity_comments
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment on activities" ON public.activity_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.activity_comments
FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON public.activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON public.activity_comments(activity_id);