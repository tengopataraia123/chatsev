
-- Add global pinning columns to polls table
ALTER TABLE public.polls 
ADD COLUMN IF NOT EXISTS globally_pinned_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS globally_pinned_by uuid DEFAULT NULL;

-- Update is_pinned default to false
ALTER TABLE public.polls ALTER COLUMN is_pinned SET DEFAULT false;
