
-- Joker Game Sessions table
CREATE TABLE public.joker_game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL,
  variant TEXT NOT NULL DEFAULT 'standard' CHECK (variant IN ('standard', 'nines')),
  khishti_type TEXT NOT NULL DEFAULT 'fixed200' CHECK (khishti_type IN ('fixed200', 'fixed500')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_set INTEGER NOT NULL DEFAULT 1,
  current_deal INTEGER NOT NULL DEFAULT 1,
  dealer_index INTEGER NOT NULL DEFAULT 0,
  current_player_index INTEGER NOT NULL DEFAULT 0,
  lead_player_index INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL DEFAULT 'waiting' CHECK (phase IN ('waiting', 'dealing', 'choosingTrump', 'bidding', 'playing', 'dealEnd', 'setEnd', 'gameOver')),
  trump_suit TEXT,
  is_no_trump BOOLEAN DEFAULT FALSE,
  trump_chooser_index INTEGER,
  cards_per_hand INTEGER DEFAULT 1,
  current_trick JSONB DEFAULT '[]'::jsonb,
  deck JSONB DEFAULT '[]'::jsonb,
  trump_card JSONB,
  deal_history JSONB DEFAULT '[]'::jsonb,
  set_subtotals JSONB DEFAULT '{}'::jsonb,
  last_trick_winner TEXT,
  winner_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Joker Game Participants
CREATE TABLE public.joker_game_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.joker_game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seat_index INTEGER NOT NULL,
  hand JSONB DEFAULT '[]'::jsonb,
  bid INTEGER,
  tricks_won INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT FALSE,
  is_connected BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id),
  UNIQUE(session_id, seat_index)
);

-- Enable RLS
ALTER TABLE public.joker_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joker_game_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for joker_game_sessions
CREATE POLICY "Anyone can view joker sessions"
  ON public.joker_game_sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create joker sessions"
  ON public.joker_game_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their joker sessions"
  ON public.joker_game_sessions FOR UPDATE
  USING (auth.uid() = host_user_id OR EXISTS (
    SELECT 1 FROM public.joker_game_participants 
    WHERE session_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Host can delete their joker sessions"
  ON public.joker_game_sessions FOR DELETE
  USING (auth.uid() = host_user_id);

-- RLS Policies for joker_game_participants
CREATE POLICY "Anyone can view joker participants"
  ON public.joker_game_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join joker games"
  ON public.joker_game_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update their own data"
  ON public.joker_game_participants FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.joker_game_sessions 
    WHERE id = session_id AND host_user_id = auth.uid()
  ));

CREATE POLICY "Users can leave joker games"
  ON public.joker_game_participants FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.joker_game_sessions 
    WHERE id = session_id AND host_user_id = auth.uid()
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.joker_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.joker_game_participants;

-- Indexes
CREATE INDEX idx_joker_sessions_host ON public.joker_game_sessions(host_user_id);
CREATE INDEX idx_joker_sessions_status ON public.joker_game_sessions(status);
CREATE INDEX idx_joker_participants_session ON public.joker_game_participants(session_id);
CREATE INDEX idx_joker_participants_user ON public.joker_game_participants(user_id);

-- Update trigger
CREATE TRIGGER update_joker_sessions_updated_at
  BEFORE UPDATE ON public.joker_game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_movies_updated_at();
