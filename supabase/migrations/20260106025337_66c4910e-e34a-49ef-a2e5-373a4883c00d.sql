-- Create table for game statistics
CREATE TABLE public.game_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'joker',
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  highest_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_type)
);

-- Create table for game history
CREATE TABLE public.game_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'joker',
  player_count INTEGER NOT NULL,
  final_score INTEGER NOT NULL,
  position INTEGER NOT NULL,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_stats
CREATE POLICY "Anyone can view game stats" 
ON public.game_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own stats" 
ON public.game_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.game_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for game_history
CREATE POLICY "Anyone can view game history" 
ON public.game_history 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own history" 
ON public.game_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE TRIGGER update_game_stats_updated_at
BEFORE UPDATE ON public.game_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();