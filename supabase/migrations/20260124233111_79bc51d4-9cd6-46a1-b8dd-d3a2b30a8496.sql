-- Create quiz_v2_presence table for tracking active quiz players
CREATE TABLE public.quiz_v2_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.quiz_v2_presence ENABLE ROW LEVEL SECURITY;

-- Anyone can view presence count
CREATE POLICY "Anyone can view quiz presence"
  ON public.quiz_v2_presence FOR SELECT
  USING (true);

-- Authenticated users can insert their presence
CREATE POLICY "Users can insert own presence"
  ON public.quiz_v2_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own presence
CREATE POLICY "Users can update own presence"
  ON public.quiz_v2_presence FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own presence
CREATE POLICY "Users can delete own presence"
  ON public.quiz_v2_presence FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_quiz_v2_presence_last_active ON public.quiz_v2_presence(last_active_at);