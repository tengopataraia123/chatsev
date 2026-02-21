
-- Create user_status table for mood/feeling/activity system
CREATE TABLE public.user_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feeling', 'activity')),
  feeling_key TEXT,
  activity_key TEXT,
  object_text TEXT,
  emoji TEXT NOT NULL,
  custom_text TEXT,
  display_text TEXT NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'only_me')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  post_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Everyone can read public statuses
CREATE POLICY "Anyone can view public statuses"
ON public.user_status FOR SELECT
USING (privacy = 'public' OR user_id = auth.uid());

-- Users can manage their own statuses
CREATE POLICY "Users can insert own status"
ON public.user_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status"
ON public.user_status FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own status"
ON public.user_status FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast active mood lookup
CREATE INDEX idx_user_status_active ON public.user_status (user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_status_post ON public.user_status (post_id) WHERE post_id IS NOT NULL;

-- Add mood_id column to posts table
ALTER TABLE public.posts ADD COLUMN mood_emoji TEXT;
ALTER TABLE public.posts ADD COLUMN mood_text TEXT;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;
