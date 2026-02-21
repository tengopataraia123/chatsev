-- Create durak lobby tables (10 game tables)
CREATE TABLE IF NOT EXISTS public.durak_lobby_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INTEGER NOT NULL UNIQUE CHECK (table_number >= 1 AND table_number <= 10),
  player1_id UUID,
  player1_username TEXT,
  player2_id UUID,
  player2_username TEXT,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'waiting', 'playing')),
  game_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create active game state table
CREATE TABLE IF NOT EXISTS public.durak_active_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.durak_lobby_tables(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  
  -- Game state stored as JSONB for flexibility
  deck JSONB NOT NULL DEFAULT '[]'::jsonb,
  trump_card JSONB,
  trump_suit TEXT,
  discard_pile JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Player hands (hidden from opponent via RLS)
  player1_hand JSONB NOT NULL DEFAULT '[]'::jsonb,
  player2_hand JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Current round state
  table_cards JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{attack: card, defense: card|null}]
  
  -- Turn management
  attacker_id UUID NOT NULL,
  defender_id UUID NOT NULL,
  phase TEXT NOT NULL DEFAULT 'attack' CHECK (phase IN ('attack', 'defense', 'pickup', 'finished')),
  
  -- Game status
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'finished')),
  winner_id UUID,
  loser_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.durak_lobby_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.durak_active_games ENABLE ROW LEVEL SECURITY;

-- RLS policies for lobby tables - everyone can view
CREATE POLICY "Anyone can view durak lobby tables" ON public.durak_lobby_tables
FOR SELECT USING (true);

-- Authenticated users can update tables (join/leave)
CREATE POLICY "Authenticated users can update durak lobby tables" ON public.durak_lobby_tables
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS policies for active games - players can view their games
CREATE POLICY "Players can view their active games" ON public.durak_active_games
FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can update their active games" ON public.durak_active_games
FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Authenticated can insert active games" ON public.durak_active_games
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Insert 10 tables
INSERT INTO public.durak_lobby_tables (table_number) VALUES 
(1), (2), (3), (4), (5), (6), (7), (8), (9), (10)
ON CONFLICT (table_number) DO NOTHING;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.durak_lobby_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.durak_active_games;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_durak_lobby_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_durak_lobby_tables_updated_at
BEFORE UPDATE ON public.durak_lobby_tables
FOR EACH ROW EXECUTE FUNCTION update_durak_lobby_updated_at();

CREATE TRIGGER update_durak_active_games_updated_at
BEFORE UPDATE ON public.durak_active_games
FOR EACH ROW EXECUTE FUNCTION update_durak_lobby_updated_at();