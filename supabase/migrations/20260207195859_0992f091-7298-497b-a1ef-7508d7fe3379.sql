-- Football Manager 2026 Module

-- Clubs table
CREATE TABLE public.fm_clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    badge_url TEXT,
    primary_color TEXT DEFAULT '#1e40af',
    secondary_color TEXT DEFAULT '#ffffff',
    budget INTEGER NOT NULL DEFAULT 50000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_id)
);

-- Coaches table (pool of available coaches)
CREATE TABLE public.fm_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    nation TEXT NOT NULL,
    style TEXT NOT NULL CHECK (style IN ('attacking', 'defensive', 'balanced', 'possession', 'counter')),
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 99),
    bonuses JSONB DEFAULT '{"training_boost": 0, "morale_boost": 0, "tactical_boost": 0}'::jsonb,
    avatar_url TEXT,
    price INTEGER NOT NULL DEFAULT 1000000,
    salary INTEGER NOT NULL DEFAULT 50000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players table (pool of available players)
CREATE TABLE public.fm_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 16 AND age <= 45),
    nation TEXT NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
    secondary_position TEXT CHECK (secondary_position IS NULL OR secondary_position IN ('GK', 'DEF', 'MID', 'FWD')),
    ovr INTEGER NOT NULL CHECK (ovr >= 1 AND ovr <= 99),
    stats JSONB NOT NULL DEFAULT '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb,
    stamina INTEGER NOT NULL DEFAULT 100 CHECK (stamina >= 0 AND stamina <= 100),
    form INTEGER NOT NULL DEFAULT 0 CHECK (form >= -5 AND form <= 5),
    injury_status TEXT DEFAULT NULL,
    potential INTEGER NOT NULL CHECK (potential >= 1 AND potential <= 99),
    foot TEXT NOT NULL DEFAULT 'right' CHECK (foot IN ('left', 'right', 'both')),
    avatar_url TEXT,
    price INTEGER NOT NULL DEFAULT 500000,
    salary INTEGER NOT NULL DEFAULT 10000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Club coach assignment
CREATE TABLE public.fm_club_coach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.fm_coaches(id) ON DELETE CASCADE,
    bought_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(club_id),
    UNIQUE(coach_id)
);

-- Club players assignment
CREATE TABLE public.fm_club_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.fm_players(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'bench' CHECK (role IN ('starter', 'bench', 'reserve')),
    slot_code TEXT,
    bought_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(player_id)
);

-- Training records
CREATE TABLE public.fm_trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.fm_players(id) ON DELETE CASCADE,
    training_type TEXT NOT NULL CHECK (training_type IN ('shooting', 'passing', 'dribbling', 'defending', 'physical', 'pace', 'stamina')),
    delta_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    energy_cost INTEGER NOT NULL DEFAULT 10,
    injury_risk_delta INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leagues table
CREATE TABLE public.fm_leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'DOUBLE_ROUND_ROBIN',
    teams_count INTEGER NOT NULL DEFAULT 10,
    matches_per_day INTEGER NOT NULL DEFAULT 3,
    start_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registering', 'active', 'finished')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- League members
CREATE TABLE public.fm_league_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES public.fm_leagues(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(league_id, club_id)
);

-- Fixtures
CREATE TABLE public.fm_fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES public.fm_leagues(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    match_day INTEGER NOT NULL,
    home_club_id UUID NOT NULL REFERENCES public.fm_clubs(id),
    away_club_id UUID NOT NULL REFERENCES public.fm_clubs(id),
    scheduled_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'played')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Match results
CREATE TABLE public.fm_match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id UUID NOT NULL REFERENCES public.fm_fixtures(id) ON DELETE CASCADE UNIQUE,
    home_goals INTEGER NOT NULL DEFAULT 0,
    away_goals INTEGER NOT NULL DEFAULT 0,
    events JSONB DEFAULT '[]'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standings
CREATE TABLE public.fm_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES public.fm_leagues(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
    played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    gf INTEGER NOT NULL DEFAULT 0,
    ga INTEGER NOT NULL DEFAULT 0,
    gd INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    last5 TEXT[] DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(league_id, club_id)
);

-- Enable RLS on all tables
ALTER TABLE public.fm_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_club_coach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_club_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fm_standings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fm_clubs
CREATE POLICY "Anyone can view clubs" ON public.fm_clubs FOR SELECT USING (true);
CREATE POLICY "Users can create own club" ON public.fm_clubs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own club" ON public.fm_clubs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own club" ON public.fm_clubs FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for fm_coaches (read-only pool)
CREATE POLICY "Anyone can view coaches" ON public.fm_coaches FOR SELECT USING (true);
CREATE POLICY "Super admins can manage coaches" ON public.fm_coaches FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for fm_players (read-only pool)
CREATE POLICY "Anyone can view players" ON public.fm_players FOR SELECT USING (true);
CREATE POLICY "Super admins can manage players" ON public.fm_players FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for fm_club_coach
CREATE POLICY "Anyone can view club coaches" ON public.fm_club_coach FOR SELECT USING (true);
CREATE POLICY "Club owners can manage their coach" ON public.fm_club_coach FOR ALL USING (
    EXISTS (SELECT 1 FROM public.fm_clubs WHERE id = club_id AND owner_id = auth.uid())
);

-- RLS Policies for fm_club_players
CREATE POLICY "Anyone can view club players" ON public.fm_club_players FOR SELECT USING (true);
CREATE POLICY "Club owners can manage their players" ON public.fm_club_players FOR ALL USING (
    EXISTS (SELECT 1 FROM public.fm_clubs WHERE id = club_id AND owner_id = auth.uid())
);

-- RLS Policies for fm_trainings
CREATE POLICY "Anyone can view trainings" ON public.fm_trainings FOR SELECT USING (true);
CREATE POLICY "Club owners can train their players" ON public.fm_trainings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.fm_clubs WHERE id = club_id AND owner_id = auth.uid())
);

-- RLS Policies for fm_leagues
CREATE POLICY "Anyone can view leagues" ON public.fm_leagues FOR SELECT USING (true);
CREATE POLICY "Super admins can create leagues" ON public.fm_leagues FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update leagues" ON public.fm_leagues FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete leagues" ON public.fm_leagues FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for fm_league_members
CREATE POLICY "Anyone can view league members" ON public.fm_league_members FOR SELECT USING (true);
CREATE POLICY "Club owners can join leagues" ON public.fm_league_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.fm_clubs WHERE id = club_id AND owner_id = auth.uid())
);
CREATE POLICY "Super admins can manage league members" ON public.fm_league_members FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for fm_fixtures
CREATE POLICY "Anyone can view fixtures" ON public.fm_fixtures FOR SELECT USING (true);
CREATE POLICY "Super admins can manage fixtures" ON public.fm_fixtures FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for fm_match_results
CREATE POLICY "Anyone can view match results" ON public.fm_match_results FOR SELECT USING (true);
CREATE POLICY "Super admins can manage match results" ON public.fm_match_results FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for fm_standings
CREATE POLICY "Anyone can view standings" ON public.fm_standings FOR SELECT USING (true);
CREATE POLICY "Super admins can manage standings" ON public.fm_standings FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to update standings after match
CREATE OR REPLACE FUNCTION public.fm_update_standings_after_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_league_id UUID;
    v_home_club_id UUID;
    v_away_club_id UUID;
    v_result TEXT;
BEGIN
    -- Get fixture info
    SELECT league_id, home_club_id, away_club_id 
    INTO v_league_id, v_home_club_id, v_away_club_id
    FROM public.fm_fixtures WHERE id = NEW.fixture_id;
    
    -- Determine result for home team
    IF NEW.home_goals > NEW.away_goals THEN
        v_result := 'W';
    ELSIF NEW.home_goals < NEW.away_goals THEN
        v_result := 'L';
    ELSE
        v_result := 'D';
    END IF;
    
    -- Update home team standings
    INSERT INTO public.fm_standings (league_id, club_id, played, wins, draws, losses, gf, ga, gd, points, last5)
    VALUES (
        v_league_id, v_home_club_id, 1,
        CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        NEW.home_goals, NEW.away_goals, NEW.home_goals - NEW.away_goals,
        CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        ARRAY[v_result]
    )
    ON CONFLICT (league_id, club_id) DO UPDATE SET
        played = fm_standings.played + 1,
        wins = fm_standings.wins + CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        draws = fm_standings.draws + CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        losses = fm_standings.losses + CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        gf = fm_standings.gf + NEW.home_goals,
        ga = fm_standings.ga + NEW.away_goals,
        gd = fm_standings.gd + (NEW.home_goals - NEW.away_goals),
        points = fm_standings.points + CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        last5 = (ARRAY[v_result] || fm_standings.last5)[1:5],
        updated_at = now();
    
    -- Determine result for away team (inverse)
    IF NEW.away_goals > NEW.home_goals THEN
        v_result := 'W';
    ELSIF NEW.away_goals < NEW.home_goals THEN
        v_result := 'L';
    ELSE
        v_result := 'D';
    END IF;
    
    -- Update away team standings
    INSERT INTO public.fm_standings (league_id, club_id, played, wins, draws, losses, gf, ga, gd, points, last5)
    VALUES (
        v_league_id, v_away_club_id, 1,
        CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        NEW.away_goals, NEW.home_goals, NEW.away_goals - NEW.home_goals,
        CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        ARRAY[v_result]
    )
    ON CONFLICT (league_id, club_id) DO UPDATE SET
        played = fm_standings.played + 1,
        wins = fm_standings.wins + CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        draws = fm_standings.draws + CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        losses = fm_standings.losses + CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        gf = fm_standings.gf + NEW.away_goals,
        ga = fm_standings.ga + NEW.home_goals,
        gd = fm_standings.gd + (NEW.away_goals - NEW.home_goals),
        points = fm_standings.points + CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        last5 = (ARRAY[v_result] || fm_standings.last5)[1:5],
        updated_at = now();
    
    -- Update fixture status
    UPDATE public.fm_fixtures SET status = 'played' WHERE id = NEW.fixture_id;
    
    -- Check if league is finished
    IF NOT EXISTS (SELECT 1 FROM public.fm_fixtures WHERE league_id = v_league_id AND status = 'pending') THEN
        UPDATE public.fm_leagues SET status = 'finished', updated_at = now() WHERE id = v_league_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for standings update
CREATE TRIGGER fm_update_standings_trigger
AFTER INSERT ON public.fm_match_results
FOR EACH ROW EXECUTE FUNCTION public.fm_update_standings_after_match();

-- Create indexes for performance
CREATE INDEX idx_fm_clubs_owner ON public.fm_clubs(owner_id);
CREATE INDEX idx_fm_club_players_club ON public.fm_club_players(club_id);
CREATE INDEX idx_fm_club_players_player ON public.fm_club_players(player_id);
CREATE INDEX idx_fm_fixtures_league ON public.fm_fixtures(league_id);
CREATE INDEX idx_fm_fixtures_date ON public.fm_fixtures(scheduled_date);
CREATE INDEX idx_fm_standings_league ON public.fm_standings(league_id);
CREATE INDEX idx_fm_league_members_league ON public.fm_league_members(league_id);