-- Add daily_streak column to wallets
ALTER TABLE public.totalizator_wallets 
ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;

-- Add foreign key for profiles (for leaderboard)
-- Note: We can't add FK to auth.users, so we reference profiles
ALTER TABLE public.totalizator_wallets 
DROP CONSTRAINT IF EXISTS totalizator_wallets_user_id_fkey;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_totalizator_wallets_total_won 
ON public.totalizator_wallets(total_won DESC);

CREATE INDEX IF NOT EXISTS idx_totalizator_wallets_total_wagered 
ON public.totalizator_wallets(total_wagered DESC);