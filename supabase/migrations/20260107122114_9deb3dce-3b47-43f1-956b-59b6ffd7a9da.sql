-- Add is_seen column to profile_visits for tracking which visits user has seen
ALTER TABLE public.profile_visits 
ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on unseen visits
CREATE INDEX IF NOT EXISTS idx_profile_visits_unseen 
ON public.profile_visits(profile_user_id, is_seen) 
WHERE is_seen = FALSE;