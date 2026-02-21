-- Create presence tables for Live, Games, and Dating

-- Live presence table
CREATE TABLE public.live_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.live_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_presence
CREATE POLICY "Anyone can view live presence" ON public.live_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own presence" ON public.live_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence" ON public.live_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence" ON public.live_presence
  FOR DELETE USING (auth.uid() = user_id);

-- Games presence table
CREATE TABLE public.games_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.games_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for games_presence
CREATE POLICY "Anyone can view games presence" ON public.games_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own presence" ON public.games_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence" ON public.games_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence" ON public.games_presence
  FOR DELETE USING (auth.uid() = user_id);

-- Dating presence table
CREATE TABLE public.dating_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.dating_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for dating_presence
CREATE POLICY "Anyone can view dating presence" ON public.dating_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own presence" ON public.dating_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence" ON public.dating_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence" ON public.dating_presence
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for faster queries
CREATE INDEX idx_live_presence_last_active ON public.live_presence(last_active_at);
CREATE INDEX idx_games_presence_last_active ON public.games_presence(last_active_at);
CREATE INDEX idx_dating_presence_last_active ON public.dating_presence(last_active_at);