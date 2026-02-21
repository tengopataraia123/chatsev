-- Unified Points Wallet System
-- Drop existing user_balances if exists and recreate with proper structure
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.user_balances CASCADE;

-- Create unified user_balances (wallet) table
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 1000,
  total_won INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  total_wagered INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet_transactions for audit trail
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- slots, roulette, poker, domino, backgammon, joker, bura, sportsbook
  action TEXT NOT NULL, -- bet, win, lose, refund, bonus, deposit
  amount INTEGER NOT NULL, -- positive for credits, negative for debits
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id TEXT, -- game round_id, match_id, bet_id etc
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_settings for admin configuration
CREATE TABLE public.game_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL UNIQUE,
  min_bet INTEGER NOT NULL DEFAULT 10,
  max_bet INTEGER NOT NULL DEFAULT 10000,
  daily_limit INTEGER DEFAULT NULL,
  rtp_percentage NUMERIC(5,2) DEFAULT NULL, -- For slots/roulette
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default game settings
INSERT INTO public.game_settings (game_type, min_bet, max_bet, rtp_percentage, settings) VALUES
  ('slots', 10, 5000, 95.00, '{"paylines": 25, "symbols": ["cherry", "lemon", "orange", "plum", "bell", "bar", "seven", "wild", "scatter"]}'),
  ('roulette', 10, 10000, 97.30, '{"type": "european", "history_size": 20}'),
  ('poker', 10, 5000, 98.00, '{"variant": "jacks_or_better"}'),
  ('domino', 50, 5000, NULL, '{"time_limit": 30}'),
  ('backgammon', 50, 5000, NULL, '{"time_limit": 30}'),
  ('joker', 50, 5000, NULL, '{"time_limit": 60}'),
  ('bura', 50, 5000, NULL, '{"time_limit": 30}'),
  ('sportsbook', 10, 50000, NULL, '{"max_selections": 10}');

-- Enable RLS
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balances
CREATE POLICY "Users can view their own balance" 
  ON public.user_balances FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" 
  ON public.user_balances FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" 
  ON public.user_balances FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances" 
  ON public.user_balances FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all balances" 
  ON public.user_balances FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their own transactions" 
  ON public.wallet_transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
  ON public.wallet_transactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" 
  ON public.wallet_transactions FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for game_settings
CREATE POLICY "Anyone can view game settings" 
  ON public.game_settings FOR SELECT 
  USING (true);

CREATE POLICY "Admins can update game settings" 
  ON public.game_settings FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert game settings" 
  ON public.game_settings FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to safely update wallet balance (atomic transaction)
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_user_id UUID,
  p_game_type TEXT,
  p_action TEXT,
  p_amount INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_min_bet INTEGER;
  v_max_bet INTEGER;
  v_game_enabled BOOLEAN;
BEGIN
  -- Get current balance (with lock)
  SELECT points INTO v_current_balance
  FROM public.user_balances
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If no balance exists, create one
  IF v_current_balance IS NULL THEN
    INSERT INTO public.user_balances (user_id, points)
    VALUES (p_user_id, 1000)
    RETURNING points INTO v_current_balance;
  END IF;
  
  -- Check game settings
  SELECT min_bet, max_bet, is_enabled 
  INTO v_min_bet, v_max_bet, v_game_enabled
  FROM public.game_settings
  WHERE game_type = p_game_type;
  
  -- Validate game is enabled
  IF v_game_enabled IS NOT NULL AND NOT v_game_enabled THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'თამაში გათიშულია'::TEXT;
    RETURN;
  END IF;
  
  -- Validate bet amount for bet actions
  IF p_action = 'bet' THEN
    IF ABS(p_amount) < COALESCE(v_min_bet, 10) THEN
      RETURN QUERY SELECT FALSE, v_current_balance, format('მინიმალური ფსონი: %s ქულა', COALESCE(v_min_bet, 10))::TEXT;
      RETURN;
    END IF;
    
    IF ABS(p_amount) > COALESCE(v_max_bet, 10000) THEN
      RETURN QUERY SELECT FALSE, v_current_balance, format('მაქსიმალური ფსონი: %s ქულა', COALESCE(v_max_bet, 10000))::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;
  
  -- Check for insufficient funds
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'არასაკმარისი ქულები'::TEXT;
    RETURN;
  END IF;
  
  -- Update balance
  UPDATE public.user_balances
  SET 
    points = v_new_balance,
    total_won = CASE WHEN p_action = 'win' THEN total_won + p_amount ELSE total_won END,
    total_lost = CASE WHEN p_action IN ('bet', 'lose') AND p_amount < 0 THEN total_lost + ABS(p_amount) ELSE total_lost END,
    total_wagered = CASE WHEN p_action = 'bet' THEN total_wagered + ABS(p_amount) ELSE total_wagered END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id, game_type, action, amount, balance_before, balance_after, reference_id, metadata
  ) VALUES (
    p_user_id, p_game_type, p_action, p_amount, v_current_balance, v_new_balance, p_reference_id, p_metadata
  );
  
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_balances_updated_at
  BEFORE UPDATE ON public.user_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_settings_updated_at
  BEFORE UPDATE ON public.game_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_game_type ON public.wallet_transactions(game_type);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_user_balances_points ON public.user_balances(points DESC);