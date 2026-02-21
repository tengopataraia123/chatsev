-- Durak game table for tracking game sessions and stats
CREATE TABLE IF NOT EXISTS public.durak_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  players JSONB NOT NULL DEFAULT '[]',
  winner_id UUID,
  loser_id UUID,  -- The "durak" (fool)
  game_variant TEXT NOT NULL DEFAULT 'podkidnoy', -- podkidnoy, perevodnoy, team
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_rounds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.durak_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view durak games"
ON public.durak_games FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert durak games"
ON public.durak_games FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update durak games"
ON public.durak_games FOR UPDATE
TO authenticated
USING (true);

-- Add index for performance
CREATE INDEX idx_durak_games_room_id ON public.durak_games(room_id);
CREATE INDEX idx_durak_games_winner_id ON public.durak_games(winner_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.durak_games;