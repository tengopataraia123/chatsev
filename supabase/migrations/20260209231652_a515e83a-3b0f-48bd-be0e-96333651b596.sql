
-- Table to store multiplayer Bura game state
CREATE TABLE public.bura_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES public.bura_lobby_tables(id) ON DELETE SET NULL,
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  current_turn UUID,
  status TEXT NOT NULL DEFAULT 'playing',
  winner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bura_games ENABLE ROW LEVEL SECURITY;

-- Players in the game can read it
CREATE POLICY "Players can view their games"
ON public.bura_games FOR SELECT
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Players can update their games
CREATE POLICY "Players can update their games"
ON public.bura_games FOR UPDATE
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Authenticated users can create games
CREATE POLICY "Authenticated users can create games"
ON public.bura_games FOR INSERT
WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bura_games;

-- Update timestamp trigger
CREATE TRIGGER update_bura_games_updated_at
BEFORE UPDATE ON public.bura_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
