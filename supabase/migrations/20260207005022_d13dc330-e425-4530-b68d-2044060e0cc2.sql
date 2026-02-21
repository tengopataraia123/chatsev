-- =====================================================
-- SPORTS PREDICTION MODULE - DATABASE SCHEMA
-- Entertainment-only prediction game with virtual coins
-- =====================================================

-- Sports enum type
CREATE TYPE public.sport_type AS ENUM (
  'football', 'basketball', 'tennis', 'hockey', 
  'volleyball', 'mma', 'baseball', 'handball', 'esports'
);

-- Prediction market types
CREATE TYPE public.market_type AS ENUM (
  'winner', 'over_under_2_5', 'both_teams_score', 
  'total_points', 'match_winner'
);

-- Coupon status
CREATE TYPE public.coupon_status AS ENUM (
  'pending', 'live', 'won', 'lost', 'void', 'partial_void'
);

-- Coupon item status
CREATE TYPE public.coupon_item_status AS ENUM (
  'pending', 'won', 'lost', 'void'
);

-- Fixture status
CREATE TYPE public.fixture_status AS ENUM (
  'scheduled', 'live', 'finished', 'postponed', 'cancelled'
);

-- =====================================================
-- SPORTS TABLE
-- =====================================================
CREATE TABLE public.prediction_sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  sport_type sport_type NOT NULL,
  api_sport_id INTEGER, -- API-Sports ID
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- LEAGUES TABLE
-- =====================================================
CREATE TABLE public.prediction_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID REFERENCES public.prediction_sports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  logo_url TEXT,
  api_league_id INTEGER, -- API-Sports league ID
  is_enabled BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prediction_leagues_sport ON public.prediction_leagues(sport_id);
CREATE INDEX idx_prediction_leagues_api_id ON public.prediction_leagues(api_league_id);

-- =====================================================
-- FIXTURES TABLE
-- =====================================================
CREATE TABLE public.prediction_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.prediction_leagues(id) ON DELETE CASCADE,
  api_fixture_id INTEGER UNIQUE, -- API-Sports fixture ID
  home_team TEXT NOT NULL,
  home_team_logo TEXT,
  away_team TEXT NOT NULL,
  away_team_logo TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  status fixture_status DEFAULT 'scheduled',
  minute INTEGER, -- Current minute for live matches
  score_home INTEGER,
  score_away INTEGER,
  -- Additional stats for settlement
  total_goals INTEGER,
  both_teams_scored BOOLEAN,
  total_points INTEGER, -- For basketball
  -- API data cache
  api_data JSONB,
  last_api_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prediction_fixtures_league ON public.prediction_fixtures(league_id);
CREATE INDEX idx_prediction_fixtures_status ON public.prediction_fixtures(status);
CREATE INDEX idx_prediction_fixtures_start_time ON public.prediction_fixtures(start_time);
CREATE INDEX idx_prediction_fixtures_api_id ON public.prediction_fixtures(api_fixture_id);

-- =====================================================
-- MARKETS TABLE (Prediction types per sport)
-- =====================================================
CREATE TABLE public.prediction_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID REFERENCES public.prediction_sports(id) ON DELETE CASCADE,
  market_type market_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_score INTEGER DEFAULT 2 CHECK (difficulty_score >= 1 AND difficulty_score <= 5),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_id, market_type)
);

-- =====================================================
-- USER PREDICTION WALLET
-- =====================================================
CREATE TABLE public.prediction_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  coins_balance INTEGER DEFAULT 500 NOT NULL CHECK (coins_balance >= 0),
  total_staked INTEGER DEFAULT 0,
  total_won INTEGER DEFAULT 0,
  total_lost INTEGER DEFAULT 0,
  coupons_count INTEGER DEFAULT 0,
  won_coupons_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prediction_wallets_user ON public.prediction_wallets(user_id);

-- =====================================================
-- COIN TRANSACTIONS
-- =====================================================
CREATE TABLE public.prediction_coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'stake', 'win', 'refund', 'grant', 'daily_bonus'
  reference_id UUID, -- coupon_id or other reference
  description TEXT,
  balance_before INTEGER,
  balance_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prediction_coin_tx_user ON public.prediction_coin_transactions(user_id);
CREATE INDEX idx_prediction_coin_tx_type ON public.prediction_coin_transactions(transaction_type);

-- =====================================================
-- COUPONS (User predictions)
-- =====================================================
CREATE TABLE public.prediction_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stake_coins INTEGER NOT NULL CHECK (stake_coins >= 10 AND stake_coins <= 10000),
  status coupon_status DEFAULT 'pending',
  total_difficulty_score INTEGER DEFAULT 0,
  selections_count INTEGER DEFAULT 0,
  potential_return_coins INTEGER DEFAULT 0,
  actual_return_coins INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX idx_prediction_coupons_user ON public.prediction_coupons(user_id);
CREATE INDEX idx_prediction_coupons_status ON public.prediction_coupons(status);

-- =====================================================
-- COUPON ITEMS (Individual predictions in a coupon)
-- =====================================================
CREATE TABLE public.prediction_coupon_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.prediction_coupons(id) ON DELETE CASCADE,
  fixture_id UUID REFERENCES public.prediction_fixtures(id) ON DELETE CASCADE,
  market_type market_type NOT NULL,
  pick TEXT NOT NULL, -- 'home', 'away', 'draw', 'over', 'under', 'yes', 'no'
  difficulty_score INTEGER DEFAULT 2,
  status coupon_item_status DEFAULT 'pending',
  result TEXT, -- Actual result after settlement
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prediction_items_coupon ON public.prediction_coupon_items(coupon_id);
CREATE INDEX idx_prediction_items_fixture ON public.prediction_coupon_items(fixture_id);
CREATE INDEX idx_prediction_items_status ON public.prediction_coupon_items(status);

-- =====================================================
-- PREDICTION SETTINGS (Admin configurable)
-- =====================================================
CREATE TABLE public.prediction_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.prediction_settings (setting_key, setting_value, description) VALUES
  ('min_stake', '10', 'Minimum stake in coins'),
  ('max_stake', '10000', 'Maximum stake in coins'),
  ('max_selections', '10', 'Maximum selections per coupon'),
  ('base_bonus_rate', '0.05', 'Base bonus rate per difficulty point'),
  ('combo_bonus_rate', '0.02', 'Combo bonus rate per additional selection'),
  ('daily_bonus_coins', '50', 'Daily login bonus coins'),
  ('new_user_coins', '500', 'Starting coins for new users');

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE public.prediction_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prediction_audit_admin ON public.prediction_audit_logs(admin_id);

-- =====================================================
-- LEADERBOARD VIEW (Materialized for performance)
-- =====================================================
CREATE TABLE public.prediction_leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT,
  avatar_url TEXT,
  period TEXT NOT NULL, -- 'weekly', 'monthly', 'alltime'
  net_coins_won INTEGER DEFAULT 0,
  total_coupons INTEGER DEFAULT 0,
  won_coupons INTEGER DEFAULT 0,
  win_rate NUMERIC(5,2) DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period)
);

CREATE INDEX idx_prediction_lb_period ON public.prediction_leaderboard_cache(period);
CREATE INDEX idx_prediction_lb_rank ON public.prediction_leaderboard_cache(period, rank);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.prediction_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_coupon_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Sports (public read, admin write)
CREATE POLICY "Anyone can view enabled sports" ON public.prediction_sports
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Admins can manage sports" ON public.prediction_sports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Leagues (public read, admin write)
CREATE POLICY "Anyone can view enabled leagues" ON public.prediction_leagues
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Admins can manage leagues" ON public.prediction_leagues
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Fixtures (public read)
CREATE POLICY "Anyone can view fixtures" ON public.prediction_fixtures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage fixtures" ON public.prediction_fixtures
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Markets (public read, admin write)
CREATE POLICY "Anyone can view enabled markets" ON public.prediction_markets
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Admins can manage markets" ON public.prediction_markets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Wallets (users can view own, admins can view all)
CREATE POLICY "Users can view own wallet" ON public.prediction_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.prediction_wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets" ON public.prediction_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage wallets" ON public.prediction_wallets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Coin transactions (users see own)
CREATE POLICY "Users can view own transactions" ON public.prediction_coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON public.prediction_coin_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coupons (users manage own)
CREATE POLICY "Users can view own coupons" ON public.prediction_coupons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coupons" ON public.prediction_coupons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all coupons" ON public.prediction_coupons
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Coupon items
CREATE POLICY "Users can view own coupon items" ON public.prediction_coupon_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.prediction_coupons 
      WHERE id = coupon_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create coupon items" ON public.prediction_coupon_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prediction_coupons 
      WHERE id = coupon_id AND user_id = auth.uid()
    )
  );

-- Settings (public read, admin write)
CREATE POLICY "Anyone can read settings" ON public.prediction_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON public.prediction_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs (admin only)
CREATE POLICY "Admins can view audit logs" ON public.prediction_audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create audit logs" ON public.prediction_audit_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Leaderboard (public read)
CREATE POLICY "Anyone can view leaderboard" ON public.prediction_leaderboard_cache
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get or create user wallet
CREATE OR REPLACE FUNCTION public.get_or_create_prediction_wallet(p_user_id UUID)
RETURNS public.prediction_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet prediction_wallets;
  v_starting_coins INTEGER;
BEGIN
  -- Get starting coins from settings
  SELECT COALESCE(setting_value::INTEGER, 500) INTO v_starting_coins
  FROM prediction_settings WHERE setting_key = 'new_user_coins';
  
  -- Try to get existing wallet
  SELECT * INTO v_wallet FROM prediction_wallets WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create new wallet
    INSERT INTO prediction_wallets (user_id, coins_balance)
    VALUES (p_user_id, v_starting_coins)
    RETURNING * INTO v_wallet;
    
    -- Log transaction
    INSERT INTO prediction_coin_transactions (user_id, amount, transaction_type, description, balance_before, balance_after)
    VALUES (p_user_id, v_starting_coins, 'grant', 'დაწყების ბონუსი', 0, v_starting_coins);
  END IF;
  
  RETURN v_wallet;
END;
$$;

-- Calculate potential return for a coupon
CREATE OR REPLACE FUNCTION public.calculate_prediction_return(
  p_stake INTEGER,
  p_difficulty_scores INTEGER[],
  p_selections_count INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_base_bonus_rate NUMERIC;
  v_combo_bonus_rate NUMERIC;
  v_total_difficulty INTEGER := 0;
  v_base_bonus NUMERIC;
  v_combo_bonus NUMERIC;
  v_total_return INTEGER;
  i INTEGER;
BEGIN
  -- Get rates from settings
  SELECT COALESCE(setting_value::NUMERIC, 0.05) INTO v_base_bonus_rate
  FROM prediction_settings WHERE setting_key = 'base_bonus_rate';
  
  SELECT COALESCE(setting_value::NUMERIC, 0.02) INTO v_combo_bonus_rate
  FROM prediction_settings WHERE setting_key = 'combo_bonus_rate';
  
  -- Sum difficulty scores
  FOR i IN 1..array_length(p_difficulty_scores, 1) LOOP
    v_total_difficulty := v_total_difficulty + p_difficulty_scores[i];
  END LOOP;
  
  -- Calculate bonuses
  v_base_bonus := p_stake * (v_base_bonus_rate * v_total_difficulty);
  v_combo_bonus := p_stake * (v_combo_bonus_rate * (p_selections_count - 1));
  
  -- Total return = stake + base bonus + combo bonus
  v_total_return := p_stake + FLOOR(v_base_bonus) + FLOOR(v_combo_bonus);
  
  RETURN v_total_return;
END;
$$;

-- Place a coupon (atomic transaction)
CREATE OR REPLACE FUNCTION public.place_prediction_coupon(
  p_user_id UUID,
  p_stake INTEGER,
  p_items JSONB -- Array of {fixture_id, market_type, pick, difficulty_score}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet prediction_wallets;
  v_coupon_id UUID;
  v_item JSONB;
  v_total_difficulty INTEGER := 0;
  v_selections_count INTEGER;
  v_potential_return INTEGER;
  v_difficulty_scores INTEGER[];
  v_min_stake INTEGER;
  v_max_stake INTEGER;
  v_max_selections INTEGER;
BEGIN
  -- Get settings
  SELECT COALESCE(setting_value::INTEGER, 10) INTO v_min_stake
  FROM prediction_settings WHERE setting_key = 'min_stake';
  
  SELECT COALESCE(setting_value::INTEGER, 10000) INTO v_max_stake
  FROM prediction_settings WHERE setting_key = 'max_stake';
  
  SELECT COALESCE(setting_value::INTEGER, 10) INTO v_max_selections
  FROM prediction_settings WHERE setting_key = 'max_selections';
  
  -- Validate stake
  IF p_stake < v_min_stake THEN
    RAISE EXCEPTION 'მინიმალური ფსონი: % coins', v_min_stake;
  END IF;
  
  IF p_stake > v_max_stake THEN
    RAISE EXCEPTION 'მაქსიმალური ფსონი: % coins', v_max_stake;
  END IF;
  
  -- Validate selections count
  v_selections_count := jsonb_array_length(p_items);
  IF v_selections_count < 1 THEN
    RAISE EXCEPTION 'აირჩიეთ მინიმუმ 1 მატჩი';
  END IF;
  
  IF v_selections_count > v_max_selections THEN
    RAISE EXCEPTION 'მაქსიმუმ % არჩევანი დაშვებულია', v_max_selections;
  END IF;
  
  -- Get user wallet
  SELECT * INTO v_wallet FROM prediction_wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create wallet if doesn't exist
    v_wallet := get_or_create_prediction_wallet(p_user_id);
  END IF;
  
  -- Check balance
  IF v_wallet.coins_balance < p_stake THEN
    RAISE EXCEPTION 'არასაკმარისი ქულები. გაქვთ: %, საჭიროა: %', v_wallet.coins_balance, p_stake;
  END IF;
  
  -- Calculate difficulty scores
  v_difficulty_scores := ARRAY[]::INTEGER[];
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_difficulty_scores := array_append(v_difficulty_scores, COALESCE((v_item->>'difficulty_score')::INTEGER, 2));
    v_total_difficulty := v_total_difficulty + COALESCE((v_item->>'difficulty_score')::INTEGER, 2);
  END LOOP;
  
  -- Calculate potential return
  v_potential_return := calculate_prediction_return(p_stake, v_difficulty_scores, v_selections_count);
  
  -- Deduct stake from wallet
  UPDATE prediction_wallets 
  SET 
    coins_balance = coins_balance - p_stake,
    total_staked = total_staked + p_stake,
    coupons_count = coupons_count + 1,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create coupon
  INSERT INTO prediction_coupons (
    user_id, stake_coins, status, total_difficulty_score, 
    selections_count, potential_return_coins
  ) VALUES (
    p_user_id, p_stake, 'pending', v_total_difficulty,
    v_selections_count, v_potential_return
  ) RETURNING id INTO v_coupon_id;
  
  -- Insert coupon items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO prediction_coupon_items (
      coupon_id, fixture_id, market_type, pick, difficulty_score
    ) VALUES (
      v_coupon_id,
      (v_item->>'fixture_id')::UUID,
      (v_item->>'market_type')::market_type,
      v_item->>'pick',
      COALESCE((v_item->>'difficulty_score')::INTEGER, 2)
    );
  END LOOP;
  
  -- Log transaction
  INSERT INTO prediction_coin_transactions (
    user_id, amount, transaction_type, reference_id, 
    description, balance_before, balance_after
  ) VALUES (
    p_user_id, -p_stake, 'stake', v_coupon_id,
    format('კუპონი #%s - %s არჩევანი', LEFT(v_coupon_id::TEXT, 8), v_selections_count),
    v_wallet.coins_balance, v_wallet.coins_balance - p_stake
  );
  
  RETURN v_coupon_id;
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_prediction_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_prediction_sports_updated_at
  BEFORE UPDATE ON public.prediction_sports
  FOR EACH ROW EXECUTE FUNCTION update_prediction_updated_at();

CREATE TRIGGER update_prediction_leagues_updated_at
  BEFORE UPDATE ON public.prediction_leagues
  FOR EACH ROW EXECUTE FUNCTION update_prediction_updated_at();

CREATE TRIGGER update_prediction_fixtures_updated_at
  BEFORE UPDATE ON public.prediction_fixtures
  FOR EACH ROW EXECUTE FUNCTION update_prediction_updated_at();

CREATE TRIGGER update_prediction_wallets_updated_at
  BEFORE UPDATE ON public.prediction_wallets
  FOR EACH ROW EXECUTE FUNCTION update_prediction_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_fixtures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_wallets;

-- =====================================================
-- INSERT DEFAULT SPORTS AND MARKETS
-- =====================================================

-- Sports
INSERT INTO public.prediction_sports (name, display_name, icon, sport_type, api_sport_id, sort_order) VALUES
  ('football', 'ფეხბურთი', '⚽', 'football', 1, 1),
  ('basketball', 'კალათბურთი', '🏀', 'basketball', 2, 2),
  ('tennis', 'ტენისი', '🎾', 'tennis', 3, 3),
  ('hockey', 'ჰოკეი', '🏒', 'hockey', 4, 4),
  ('volleyball', 'ფრენბურთი', '🏐', 'volleyball', 5, 5),
  ('mma', 'MMA', '🥊', 'mma', 6, 6),
  ('baseball', 'ბეისბოლი', '⚾', 'baseball', 7, 7),
  ('handball', 'ხელბურთი', '🤾', 'handball', 8, 8),
  ('esports', 'კიბერსპორტი', '🎮', 'esports', 9, 9);

-- Markets for each sport
INSERT INTO public.prediction_markets (sport_id, market_type, name, description, difficulty_score) 
SELECT s.id, 'winner', 'გამარჯვებული', 'ვინ მოიგებს მატჩს', 2
FROM prediction_sports s WHERE s.name = 'football';

INSERT INTO public.prediction_markets (sport_id, market_type, name, description, difficulty_score) 
SELECT s.id, 'over_under_2_5', 'სულ გოლები 2.5+', 'გაიტანება 3+ გოლი?', 3
FROM prediction_sports s WHERE s.name = 'football';

INSERT INTO public.prediction_markets (sport_id, market_type, name, description, difficulty_score) 
SELECT s.id, 'both_teams_score', 'ორივე გაიტანს', 'ორივე გუნდი გაიტანს გოლს?', 3
FROM prediction_sports s WHERE s.name = 'football';

INSERT INTO public.prediction_markets (sport_id, market_type, name, description, difficulty_score) 
SELECT s.id, 'winner', 'გამარჯვებული', 'ვინ მოიგებს მატჩს', 2
FROM prediction_sports s WHERE s.name = 'basketball';

INSERT INTO public.prediction_markets (sport_id, market_type, name, description, difficulty_score) 
SELECT s.id, 'total_points', 'სულ ქულები', 'მეტი თუ ნაკლები', 3
FROM prediction_sports s WHERE s.name = 'basketball';

INSERT INTO public.prediction_markets (sport_id, market_type, name, description, difficulty_score) 
SELECT s.id, 'match_winner', 'გამარჯვებული', 'ვინ მოიგებს მატჩს', 2
FROM prediction_sports s WHERE s.name IN ('tennis', 'hockey', 'volleyball', 'mma', 'baseball', 'handball', 'esports');