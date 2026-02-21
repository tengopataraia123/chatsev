-- Joker game lobby tables (10 tables for 4 players each)
CREATE TABLE public.joker_lobby_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INTEGER NOT NULL UNIQUE,
  player1_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player1_username TEXT,
  player2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player2_username TEXT,
  player3_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player3_username TEXT,
  player4_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player4_username TEXT,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'waiting', 'playing')),
  game_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert 10 default tables
INSERT INTO public.joker_lobby_tables (table_number) 
SELECT generate_series(1, 10);

-- Enable RLS
ALTER TABLE public.joker_lobby_tables ENABLE ROW LEVEL SECURITY;

-- RLS policies for lobby tables
CREATE POLICY "Anyone can view joker lobby tables"
  ON public.joker_lobby_tables FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join joker tables"
  ON public.joker_lobby_tables FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Joker active games table
CREATE TABLE public.joker_active_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.joker_lobby_tables(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  player3_id UUID NOT NULL,
  player4_id UUID NOT NULL,
  
  -- Game state stored as JSONB
  deck JSONB NOT NULL DEFAULT '[]',
  trump_card JSONB,
  trump_suit TEXT,
  
  -- Player hands
  player1_hand JSONB NOT NULL DEFAULT '[]',
  player2_hand JSONB NOT NULL DEFAULT '[]',
  player3_hand JSONB NOT NULL DEFAULT '[]',
  player4_hand JSONB NOT NULL DEFAULT '[]',
  
  -- Current trick
  current_trick JSONB NOT NULL DEFAULT '[]',
  trick_leader_id UUID,
  
  -- Bidding state
  bids JSONB NOT NULL DEFAULT '{}',
  tricks_won JSONB NOT NULL DEFAULT '{}',
  
  -- Game progress
  current_set INTEGER NOT NULL DEFAULT 1,
  current_round INTEGER NOT NULL DEFAULT 1,
  cards_per_round INTEGER NOT NULL DEFAULT 1,
  dealer_id UUID NOT NULL,
  current_player_id UUID NOT NULL,
  
  -- Phases: 'bidding', 'playing', 'round_end', 'set_end', 'game_end'
  phase TEXT NOT NULL DEFAULT 'bidding',
  
  -- Scoreboard
  scoreboard JSONB NOT NULL DEFAULT '[]',
  player_scores JSONB NOT NULL DEFAULT '{}',
  
  -- Game status
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'finished')),
  winner_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.joker_active_games ENABLE ROW LEVEL SECURITY;

-- RLS policies for active games
CREATE POLICY "Players can view their joker games"
  ON public.joker_active_games FOR SELECT
  USING (
    auth.uid() IN (player1_id, player2_id, player3_id, player4_id)
  );

CREATE POLICY "Players can update their joker games"
  ON public.joker_active_games FOR UPDATE
  USING (
    auth.uid() IN (player1_id, player2_id, player3_id, player4_id)
  );

CREATE POLICY "System can insert joker games"
  ON public.joker_active_games FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.joker_lobby_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.joker_active_games;

-- Trigger for updated_at
CREATE TRIGGER update_joker_lobby_updated_at
  BEFORE UPDATE ON public.joker_lobby_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_durak_lobby_updated_at();

CREATE TRIGGER update_joker_games_updated_at
  BEFORE UPDATE ON public.joker_active_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_durak_lobby_updated_at();