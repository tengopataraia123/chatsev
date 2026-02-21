-- Drop existing functions first
DROP FUNCTION IF EXISTS place_prediction_coupon(UUID, INTEGER, JSONB) CASCADE;
DROP FUNCTION IF EXISTS calculate_prediction_return(INTEGER, DECIMAL, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_prediction_wallet(UUID) CASCADE;

-- Drop ALL existing prediction tables
DROP TABLE IF EXISTS prediction_audit_logs CASCADE;
DROP TABLE IF EXISTS prediction_coupon_items CASCADE;
DROP TABLE IF EXISTS prediction_coupons CASCADE;
DROP TABLE IF EXISTS prediction_coin_transactions CASCADE;
DROP TABLE IF EXISTS prediction_wallets CASCADE;
DROP TABLE IF EXISTS prediction_markets CASCADE;
DROP TABLE IF EXISTS prediction_fixtures CASCADE;
DROP TABLE IF EXISTS prediction_leagues CASCADE;
DROP TABLE IF EXISTS prediction_sports CASCADE;
DROP TABLE IF EXISTS prediction_settings CASCADE;
DROP TABLE IF EXISTS prediction_top_leagues CASCADE;
DROP TABLE IF EXISTS prediction_api_sync CASCADE;
DROP TABLE IF EXISTS prediction_module_settings CASCADE;
DROP TABLE IF EXISTS prediction_leaderboard_cache CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS sport_type CASCADE;
DROP TYPE IF EXISTS market_type CASCADE;
DROP TYPE IF EXISTS coupon_status CASCADE;
DROP TYPE IF EXISTS coupon_item_status CASCADE;
DROP TYPE IF EXISTS fixture_status CASCADE;

-- Create enums
CREATE TYPE fixture_status AS ENUM ('NS', 'LIVE', '1H', 'HT', '2H', 'FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO', 'INT', 'SUSP');
CREATE TYPE market_type AS ENUM ('winner', 'over_under_2_5', 'both_teams_score');
CREATE TYPE coupon_status AS ENUM ('pending', 'won', 'lost', 'void', 'partial');
CREATE TYPE coupon_item_status AS ENUM ('pending', 'won', 'lost', 'void');

-- Top leagues whitelist
CREATE TABLE prediction_top_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  api_league_id INTEGER NOT NULL UNIQUE,
  logo_url TEXT,
  priority INTEGER NOT NULL DEFAULT 10,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fixtures cache
CREATE TABLE prediction_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_fixture_id INTEGER NOT NULL UNIQUE,
  api_league_id INTEGER NOT NULL REFERENCES prediction_top_leagues(api_league_id),
  league_name TEXT NOT NULL,
  league_logo TEXT,
  league_priority INTEGER NOT NULL DEFAULT 10,
  home_team_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_name TEXT NOT NULL,
  away_team_logo TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  status fixture_status NOT NULL DEFAULT 'NS',
  score_home INTEGER,
  score_away INTEGER,
  venue TEXT,
  last_api_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Markets
CREATE TABLE prediction_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type market_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_score DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wallets
CREATE TABLE prediction_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  coins_balance INTEGER NOT NULL DEFAULT 500,
  total_staked INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  coupons_won INTEGER NOT NULL DEFAULT 0,
  coupons_lost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE prediction_coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES prediction_wallets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coupons
CREATE TABLE prediction_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stake_coins INTEGER NOT NULL,
  potential_return_coins INTEGER NOT NULL,
  actual_return_coins INTEGER,
  status coupon_status NOT NULL DEFAULT 'pending',
  selections_count INTEGER NOT NULL DEFAULT 0,
  total_difficulty DECIMAL(5,2) NOT NULL DEFAULT 0,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Coupon Items
CREATE TABLE prediction_coupon_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES prediction_coupons(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES prediction_fixtures(id),
  market_type market_type NOT NULL,
  pick TEXT NOT NULL,
  difficulty_score DECIMAL(3,2) NOT NULL,
  status coupon_item_status NOT NULL DEFAULT 'pending',
  actual_result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API Sync
CREATE TABLE prediction_api_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
  api_calls_used INTEGER NOT NULL DEFAULT 0,
  fixtures_synced INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings
CREATE TABLE prediction_module_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pf_start ON prediction_fixtures(start_time);
CREATE INDEX idx_pf_status ON prediction_fixtures(status);
CREATE INDEX idx_pf_league ON prediction_fixtures(api_league_id);
CREATE INDEX idx_pc_user ON prediction_coupons(user_id);
CREATE INDEX idx_pc_status ON prediction_coupons(status);
CREATE INDEX idx_pci_fix ON prediction_coupon_items(fixture_id);
CREATE INDEX idx_pci_status ON prediction_coupon_items(status);

-- Insert leagues
INSERT INTO prediction_top_leagues (key, name, country, api_league_id, priority, logo_url) VALUES
  ('UCL', 'UEFA Champions League', 'Europe', 2, 0, 'https://media.api-sports.io/football/leagues/2.png'),
  ('EPL', 'Premier League', 'England', 39, 1, 'https://media.api-sports.io/football/leagues/39.png'),
  ('LALIGA', 'La Liga', 'Spain', 140, 2, 'https://media.api-sports.io/football/leagues/140.png'),
  ('BUNDESLIGA', 'Bundesliga', 'Germany', 78, 3, 'https://media.api-sports.io/football/leagues/78.png'),
  ('SERIEA', 'Serie A', 'Italy', 135, 4, 'https://media.api-sports.io/football/leagues/135.png'),
  ('LIGUE1', 'Ligue 1', 'France', 61, 5, 'https://media.api-sports.io/football/leagues/61.png');

-- Insert markets
INSERT INTO prediction_markets (type, name, description, difficulty_score) VALUES
  ('winner', 'გამარჯვებული', 'Home / Draw / Away', 1.50),
  ('over_under_2_5', 'მეტი/ნაკლები 2.5', 'Total goals', 1.80),
  ('both_teams_score', 'ორივე გაიტანს', 'Yes / No', 2.00);

-- Insert settings
INSERT INTO prediction_module_settings (key, value, description) VALUES
  ('min_stake', '10', 'Min'),
  ('max_stake', '500', 'Max'),
  ('max_selections', '10', 'MaxSel'),
  ('daily_api_limit', '100', 'API'),
  ('cache_mode', 'false', 'Cache'),
  ('base_bonus_pct', '0.05', 'Base'),
  ('combo_bonus_pct', '0.02', 'Combo'),
  ('starting_coins', '500', 'Start');

-- RLS
ALTER TABLE prediction_top_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_coupon_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_api_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_module_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "pred_leagues_pub" ON prediction_top_leagues FOR SELECT USING (true);
CREATE POLICY "pred_fix_pub" ON prediction_fixtures FOR SELECT USING (true);
CREATE POLICY "pred_mrkt_pub" ON prediction_markets FOR SELECT USING (true);
CREATE POLICY "pred_wal_sel" ON prediction_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pred_wal_ins" ON prediction_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pred_wal_upd" ON prediction_wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pred_tr_sel" ON prediction_coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pred_cp_sel" ON prediction_coupons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pred_cp_ins" ON prediction_coupons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pred_cpi_sel" ON prediction_coupon_items FOR SELECT USING (EXISTS (SELECT 1 FROM prediction_coupons WHERE id = coupon_id AND user_id = auth.uid()));
CREATE POLICY "pred_sync_adm" ON prediction_api_sync FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pred_set_pub" ON prediction_module_settings FOR SELECT USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE prediction_fixtures;
ALTER PUBLICATION supabase_realtime ADD TABLE prediction_coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE prediction_wallets;