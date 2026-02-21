
-- Create user_balances table for betting points
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 1000,
  total_won INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bets table
CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  match_id TEXT NOT NULL,
  sport_key TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  bet_type TEXT NOT NULL, -- 'home', 'away', 'draw'
  odds DECIMAL(10,2) NOT NULL,
  amount INTEGER NOT NULL,
  potential_win INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'won', 'lost', 'cancelled'
  commence_time TIMESTAMP WITH TIME ZONE NOT NULL,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_balances
CREATE POLICY "Users can view their own balance"
ON public.user_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance"
ON public.user_balances FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance"
ON public.user_balances FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for bets
CREATE POLICY "Users can view their own bets"
ON public.bets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bets"
ON public.bets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all bets for leaderboard"
ON public.bets FOR SELECT
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_balances;

-- Create trigger for updated_at
CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON public.user_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
