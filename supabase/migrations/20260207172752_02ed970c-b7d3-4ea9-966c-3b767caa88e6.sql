-- =========================================
-- ADVANCED VIRTUAL TOTALIZATOR SYSTEM
-- =========================================

-- Drop existing virtual tables if they exist (clean slate)
DROP TABLE IF EXISTS public.totalizator_bets CASCADE;
DROP TABLE IF EXISTS public.totalizator_bet_items CASCADE;
DROP TABLE IF EXISTS public.totalizator_markets CASCADE;
DROP TABLE IF EXISTS public.totalizator_matches CASCADE;
DROP TABLE IF EXISTS public.totalizator_standings CASCADE;
DROP TABLE IF EXISTS public.totalizator_teams CASCADE;
DROP TABLE IF EXISTS public.totalizator_leagues CASCADE;
DROP TABLE IF EXISTS public.totalizator_wallets CASCADE;

-- =========================================
-- 1. LEAGUES TABLE
-- =========================================
CREATE TABLE public.totalizator_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  logo_url TEXT,
  league_type TEXT NOT NULL CHECK (league_type IN ('champions_league', 'domestic', 'national')),
  teams_count INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  season TEXT NOT NULL DEFAULT '2025/2026',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- 2. TEAMS TABLE
-- =========================================
CREATE TABLE public.totalizator_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.totalizator_leagues(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  country TEXT NOT NULL,
  strength_attack INTEGER NOT NULL DEFAULT 70 CHECK (strength_attack BETWEEN 1 AND 100),
  strength_defense INTEGER NOT NULL DEFAULT 70 CHECK (strength_defense BETWEEN 1 AND 100),
  strength_overall INTEGER NOT NULL DEFAULT 70 CHECK (strength_overall BETWEEN 1 AND 100),
  home_advantage INTEGER NOT NULL DEFAULT 5 CHECK (home_advantage BETWEEN 0 AND 20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- 3. STANDINGS TABLE
-- =========================================
CREATE TABLE public.totalizator_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.totalizator_leagues(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.totalizator_teams(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points INTEGER NOT NULL DEFAULT 0,
  form TEXT[] DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, team_id)
);

-- =========================================
-- 4. MATCHES TABLE
-- =========================================
CREATE TABLE public.totalizator_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.totalizator_leagues(id) ON DELETE CASCADE NOT NULL,
  home_team_id UUID REFERENCES public.totalizator_teams(id) ON DELETE CASCADE NOT NULL,
  away_team_id UUID REFERENCES public.totalizator_teams(id) ON DELETE CASCADE NOT NULL,
  match_day INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'postponed')),
  starts_at TIMESTAMPTZ NOT NULL,
  minute INTEGER DEFAULT 0,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  home_score_ht INTEGER,
  away_score_ht INTEGER,
  stats JSONB DEFAULT '{}'::JSONB,
  result TEXT CHECK (result IN ('home', 'draw', 'away')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- 5. MARKETS TABLE (Betting odds per match)
-- =========================================
CREATE TABLE public.totalizator_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.totalizator_matches(id) ON DELETE CASCADE NOT NULL,
  market_type TEXT NOT NULL,
  market_name TEXT NOT NULL,
  selections JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, market_type)
);

-- =========================================
-- 6. USER WALLETS
-- =========================================
CREATE TABLE public.totalizator_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 1000,
  total_wagered INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  bets_won INTEGER NOT NULL DEFAULT 0,
  bets_lost INTEGER NOT NULL DEFAULT 0,
  last_daily_bonus TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- 7. BETS TABLE (User bet slips)
-- =========================================
CREATE TABLE public.totalizator_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stake INTEGER NOT NULL CHECK (stake >= 10),
  total_odds DECIMAL(10, 2) NOT NULL,
  potential_win INTEGER NOT NULL,
  actual_win INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void', 'partial')),
  selections_count INTEGER NOT NULL DEFAULT 0,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- 8. BET ITEMS TABLE (Individual selections)
-- =========================================
CREATE TABLE public.totalizator_bet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id UUID REFERENCES public.totalizator_bets(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.totalizator_matches(id) ON DELETE CASCADE NOT NULL,
  market_type TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- ENABLE RLS
-- =========================================
ALTER TABLE public.totalizator_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totalizator_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totalizator_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totalizator_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totalizator_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totalizator_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totalizator_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totalizator_bet_items ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES - PUBLIC READ
-- =========================================
CREATE POLICY "Leagues are viewable by everyone" ON public.totalizator_leagues FOR SELECT USING (true);
CREATE POLICY "Teams are viewable by everyone" ON public.totalizator_teams FOR SELECT USING (true);
CREATE POLICY "Standings are viewable by everyone" ON public.totalizator_standings FOR SELECT USING (true);
CREATE POLICY "Matches are viewable by everyone" ON public.totalizator_matches FOR SELECT USING (true);
CREATE POLICY "Markets are viewable by everyone" ON public.totalizator_markets FOR SELECT USING (true);

-- =========================================
-- RLS POLICIES - USER WALLETS
-- =========================================
CREATE POLICY "Users can view own wallet" ON public.totalizator_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.totalizator_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.totalizator_wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- RLS POLICIES - USER BETS
-- =========================================
CREATE POLICY "Users can view own bets" ON public.totalizator_bets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bets" ON public.totalizator_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Bet items viewable by bet owner" ON public.totalizator_bet_items FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.totalizator_bets WHERE id = bet_id AND user_id = auth.uid()));
CREATE POLICY "Bet items insertable by bet owner" ON public.totalizator_bet_items FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.totalizator_bets WHERE id = bet_id AND user_id = auth.uid()));

-- =========================================
-- ADMIN POLICIES
-- =========================================
CREATE POLICY "Admins can manage leagues" ON public.totalizator_leagues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage teams" ON public.totalizator_teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage standings" ON public.totalizator_standings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage matches" ON public.totalizator_matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage markets" ON public.totalizator_markets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage wallets" ON public.totalizator_wallets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bets" ON public.totalizator_bets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bet items" ON public.totalizator_bet_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- INDEXES
-- =========================================
CREATE INDEX idx_totalizator_teams_league ON public.totalizator_teams(league_id);
CREATE INDEX idx_totalizator_standings_league ON public.totalizator_standings(league_id);
CREATE INDEX idx_totalizator_matches_league ON public.totalizator_matches(league_id);
CREATE INDEX idx_totalizator_matches_status ON public.totalizator_matches(status);
CREATE INDEX idx_totalizator_matches_starts_at ON public.totalizator_matches(starts_at);
CREATE INDEX idx_totalizator_markets_match ON public.totalizator_markets(match_id);
CREATE INDEX idx_totalizator_bets_user ON public.totalizator_bets(user_id);
CREATE INDEX idx_totalizator_bets_status ON public.totalizator_bets(status);
CREATE INDEX idx_totalizator_bet_items_bet ON public.totalizator_bet_items(bet_id);
CREATE INDEX idx_totalizator_bet_items_match ON public.totalizator_bet_items(match_id);

-- =========================================
-- ENABLE REALTIME
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.totalizator_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.totalizator_standings;