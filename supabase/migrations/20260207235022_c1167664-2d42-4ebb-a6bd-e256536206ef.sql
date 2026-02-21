-- Add strength column to clubs if not exists
ALTER TABLE fm_clubs ADD COLUMN IF NOT EXISTS strength integer DEFAULT 50;

-- Create friendly match challenges table
CREATE TABLE IF NOT EXISTS fm_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_club_id uuid REFERENCES fm_clubs(id) ON DELETE CASCADE NOT NULL,
  challenged_club_id uuid REFERENCES fm_clubs(id) ON DELETE CASCADE NOT NULL,
  challenger_user_id uuid NOT NULL,
  challenged_user_id uuid NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'playing', 'completed', 'expired')),
  match_result jsonb,
  challenger_score integer,
  challenged_score integer,
  winner_club_id uuid REFERENCES fm_clubs(id) ON DELETE SET NULL,
  strength_gained integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS
ALTER TABLE fm_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for challenges
CREATE POLICY "Users can view their own challenges"
ON fm_challenges FOR SELECT
USING (auth.uid() = challenger_user_id OR auth.uid() = challenged_user_id);

CREATE POLICY "Users can create challenges"
ON fm_challenges FOR INSERT
WITH CHECK (auth.uid() = challenger_user_id);

CREATE POLICY "Users can update their challenges"
ON fm_challenges FOR UPDATE
USING (auth.uid() = challenger_user_id OR auth.uid() = challenged_user_id);

-- Add realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE fm_challenges;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fm_challenges_challenged_user ON fm_challenges(challenged_user_id, status);
CREATE INDEX IF NOT EXISTS idx_fm_challenges_challenger_user ON fm_challenges(challenger_user_id, status);
CREATE INDEX IF NOT EXISTS idx_fm_challenges_expires ON fm_challenges(expires_at) WHERE status = 'pending';

-- Update existing clubs with calculated strength based on their players
UPDATE fm_clubs c
SET strength = COALESCE(
  (SELECT ROUND(AVG(p.ovr)) 
   FROM fm_club_players cp 
   JOIN fm_players p ON cp.player_id = p.id 
   WHERE cp.club_id = c.id),
  50
);