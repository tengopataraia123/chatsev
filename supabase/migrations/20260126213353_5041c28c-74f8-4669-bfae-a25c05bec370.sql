-- Create movies presence table for tracking active users in movies section
CREATE TABLE public.movies_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movies_presence ENABLE ROW LEVEL SECURITY;

-- Anyone can view presence counts
CREATE POLICY "Anyone can view movies presence"
ON public.movies_presence FOR SELECT
USING (true);

-- Authenticated users can insert/update their own presence
CREATE POLICY "Users can insert their own presence"
ON public.movies_presence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
ON public.movies_presence FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
ON public.movies_presence FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_movies_presence_last_active ON public.movies_presence(last_active_at DESC);