
-- Drop WWW game tables
DROP TABLE IF EXISTS public.www_game_answers CASCADE;
DROP TABLE IF EXISTS public.www_game_participants CASCADE;
DROP TABLE IF EXISTS public.www_game_sessions CASCADE;

-- Create Sudoku games table for persistence
CREATE TABLE public.sudoku_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  puzzle JSONB NOT NULL,
  solution JSONB NOT NULL,
  current_state JSONB NOT NULL,
  pencil_marks JSONB DEFAULT '{}',
  hints_used INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  elapsed_seconds INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'paused', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sudoku_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sudoku games"
  ON public.sudoku_games FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sudoku games"
  ON public.sudoku_games FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sudoku games"
  ON public.sudoku_games FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sudoku games"
  ON public.sudoku_games FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_sudoku_games_user_status ON public.sudoku_games(user_id, status);
CREATE INDEX idx_sudoku_games_user_difficulty ON public.sudoku_games(user_id, difficulty);

-- Best scores / leaderboard table
CREATE TABLE public.sudoku_best_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  best_time_seconds INTEGER NOT NULL,
  best_score INTEGER NOT NULL,
  total_wins INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, difficulty)
);

ALTER TABLE public.sudoku_best_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sudoku scores"
  ON public.sudoku_best_scores FOR SELECT USING (true);
CREATE POLICY "Users can insert their own scores"
  ON public.sudoku_best_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scores"
  ON public.sudoku_best_scores FOR UPDATE USING (auth.uid() = user_id);
