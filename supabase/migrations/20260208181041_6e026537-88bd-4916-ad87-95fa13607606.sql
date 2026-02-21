-- FM Live Matches: Real-time match simulation with 3D viewer support
-- Add fans/attendance tracking to clubs
ALTER TABLE public.fm_clubs ADD COLUMN IF NOT EXISTS fans_count INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE public.fm_clubs ADD COLUMN IF NOT EXISTS total_wins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.fm_clubs ADD COLUMN IF NOT EXISTS total_draws INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.fm_clubs ADD COLUMN IF NOT EXISTS total_losses INTEGER NOT NULL DEFAULT 0;

-- Add market_value tracking to players for transfer market
ALTER TABLE public.fm_players ADD COLUMN IF NOT EXISTS initial_ovr INTEGER;
ALTER TABLE public.fm_players ADD COLUMN IF NOT EXISTS market_multiplier NUMERIC(4,2) DEFAULT 1.0;

-- Transfer market listings
CREATE TABLE IF NOT EXISTS public.fm_transfer_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.fm_players(id) ON DELETE CASCADE,
  seller_club_id UUID NOT NULL REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
  asking_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  buyer_club_id UUID REFERENCES public.fm_clubs(id),
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Live match state for 3D viewer
CREATE TABLE IF NOT EXISTS public.fm_live_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID REFERENCES public.fm_fixtures(id) ON DELETE SET NULL,
  challenge_id UUID REFERENCES public.fm_challenges(id) ON DELETE SET NULL,
  home_club_id UUID NOT NULL REFERENCES public.fm_clubs(id),
  away_club_id UUID NOT NULL REFERENCES public.fm_clubs(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'halftime', 'finished', 'cancelled')),
  home_goals INTEGER NOT NULL DEFAULT 0,
  away_goals INTEGER NOT NULL DEFAULT 0,
  current_minute INTEGER NOT NULL DEFAULT 0,
  stoppage_time INTEGER NOT NULL DEFAULT 0,
  half INTEGER NOT NULL DEFAULT 1,
  ball_position JSONB DEFAULT '{"x": 50, "y": 50}'::jsonb,
  home_formation JSONB,
  away_formation JSONB,
  player_positions JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  attendance INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Match events (goals, cards, subs, etc.) for timeline
CREATE TABLE IF NOT EXISTS public.fm_match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.fm_live_matches(id) ON DELETE CASCADE,
  minute INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('goal', 'assist', 'yellow_card', 'red_card', 'substitution', 'shot', 'save', 'foul', 'corner', 'offside', 'kickoff', 'halftime', 'fulltime')),
  team TEXT NOT NULL CHECK (team IN ('home', 'away')),
  player_id UUID REFERENCES public.fm_players(id),
  secondary_player_id UUID REFERENCES public.fm_players(id),
  description TEXT,
  position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Match substitutions tracking
CREATE TABLE IF NOT EXISTS public.fm_match_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.fm_live_matches(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.fm_clubs(id),
  minute INTEGER NOT NULL,
  player_out_id UUID NOT NULL REFERENCES public.fm_players(id),
  player_in_id UUID NOT NULL REFERENCES public.fm_players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User sound preferences
CREATE TABLE IF NOT EXISTS public.fm_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  performance_mode BOOLEAN NOT NULL DEFAULT false,
  camera_preference TEXT DEFAULT 'broadcast',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.fm_transfer_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_match_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transfer listings
CREATE POLICY "Anyone can view active transfer listings" ON public.fm_transfer_listings
  FOR SELECT USING (status = 'active' OR seller_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid()));

CREATE POLICY "Club owners can create listings" ON public.fm_transfer_listings
  FOR INSERT WITH CHECK (seller_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid()));

CREATE POLICY "Sellers can update their listings" ON public.fm_transfer_listings
  FOR UPDATE USING (seller_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid()));

-- RLS for live matches (anyone can view, match participants can update)
CREATE POLICY "Anyone can view live matches" ON public.fm_live_matches FOR SELECT USING (true);

CREATE POLICY "Match participants can update" ON public.fm_live_matches
  FOR UPDATE USING (
    home_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid()) OR
    away_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid())
  );

CREATE POLICY "System can insert matches" ON public.fm_live_matches
  FOR INSERT WITH CHECK (
    home_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid()) OR
    away_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid())
  );

-- RLS for match events
CREATE POLICY "Anyone can view match events" ON public.fm_match_events FOR SELECT USING (true);

CREATE POLICY "Match participants can insert events" ON public.fm_match_events
  FOR INSERT WITH CHECK (
    match_id IN (
      SELECT id FROM public.fm_live_matches 
      WHERE home_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid())
         OR away_club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid())
    )
  );

-- RLS for substitutions
CREATE POLICY "Anyone can view substitutions" ON public.fm_match_substitutions FOR SELECT USING (true);

CREATE POLICY "Club owners can make substitutions" ON public.fm_match_substitutions
  FOR INSERT WITH CHECK (club_id IN (SELECT id FROM public.fm_clubs WHERE owner_id = auth.uid()));

-- RLS for user preferences
CREATE POLICY "Users can manage their preferences" ON public.fm_user_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Enable realtime for live matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.fm_live_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fm_match_events;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_fm_live_matches_status ON public.fm_live_matches(status);
CREATE INDEX IF NOT EXISTS idx_fm_live_matches_fixture ON public.fm_live_matches(fixture_id);
CREATE INDEX IF NOT EXISTS idx_fm_match_events_match ON public.fm_match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_fm_transfer_listings_status ON public.fm_transfer_listings(status);

-- Function to calculate fan growth
CREATE OR REPLACE FUNCTION public.calculate_fm_fans(
  p_club_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_fans INTEGER := 5000;
  v_strength INTEGER;
  v_wins INTEGER;
  v_strength_factor INTEGER;
  v_win_factor INTEGER;
  v_result INTEGER;
BEGIN
  SELECT strength, total_wins INTO v_strength, v_wins
  FROM public.fm_clubs WHERE id = p_club_id;
  
  v_strength_factor := GREATEST(0, (COALESCE(v_strength, 50) - 50)) * 100;
  v_win_factor := COALESCE(v_wins, 0) * 200;
  
  v_result := LEAST(v_base_fans + v_strength_factor + v_win_factor, 100000);
  
  RETURN v_result;
END;
$$;