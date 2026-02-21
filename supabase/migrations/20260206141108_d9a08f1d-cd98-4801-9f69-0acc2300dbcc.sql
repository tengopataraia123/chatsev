-- Create Domino lobby tables
CREATE TABLE public.domino_lobby_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'waiting', 'playing')),
  player1_id UUID REFERENCES auth.users(id),
  player1_username TEXT,
  player2_id UUID REFERENCES auth.users(id),
  player2_username TEXT,
  game_id UUID,
  bet_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Nardi (Backgammon) lobby tables
CREATE TABLE public.nardi_lobby_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'waiting', 'playing')),
  player1_id UUID REFERENCES auth.users(id),
  player1_username TEXT,
  player2_id UUID REFERENCES auth.users(id),
  player2_username TEXT,
  game_id UUID,
  bet_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Bura lobby tables  
CREATE TABLE public.bura_lobby_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'waiting', 'playing')),
  player1_id UUID REFERENCES auth.users(id),
  player1_username TEXT,
  player2_id UUID REFERENCES auth.users(id),
  player2_username TEXT,
  game_id UUID,
  bet_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domino_lobby_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nardi_lobby_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bura_lobby_tables ENABLE ROW LEVEL SECURITY;

-- Create policies for all three tables
CREATE POLICY "Anyone can view domino tables" ON public.domino_lobby_tables FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update domino tables" ON public.domino_lobby_tables FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view nardi tables" ON public.nardi_lobby_tables FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update nardi tables" ON public.nardi_lobby_tables FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view bura tables" ON public.bura_lobby_tables FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update bura tables" ON public.bura_lobby_tables FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.domino_lobby_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nardi_lobby_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bura_lobby_tables;

-- Seed 10 tables for each game
INSERT INTO public.domino_lobby_tables (table_number) VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10);
INSERT INTO public.nardi_lobby_tables (table_number) VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10);
INSERT INTO public.bura_lobby_tables (table_number) VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10);