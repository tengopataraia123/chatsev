-- Add league_wins and level to fm_clubs
ALTER TABLE public.fm_clubs 
ADD COLUMN IF NOT EXISTS league_wins integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Create index for leaderboard
CREATE INDEX IF NOT EXISTS idx_fm_clubs_league_wins ON public.fm_clubs(league_wins DESC);

-- Update RLS policy to allow public viewing of clubs
DROP POLICY IF EXISTS "Anyone can view clubs" ON public.fm_clubs;
CREATE POLICY "Anyone can view clubs" 
ON public.fm_clubs 
FOR SELECT 
TO authenticated 
USING (true);

-- Ensure owners can update their clubs
DROP POLICY IF EXISTS "Owners can update own clubs" ON public.fm_clubs;
CREATE POLICY "Owners can update own clubs" 
ON public.fm_clubs 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = owner_id);

-- Ensure owners can delete their clubs
DROP POLICY IF EXISTS "Owners can delete own clubs" ON public.fm_clubs;
CREATE POLICY "Owners can delete own clubs" 
ON public.fm_clubs 
FOR DELETE 
TO authenticated 
USING (auth.uid() = owner_id);