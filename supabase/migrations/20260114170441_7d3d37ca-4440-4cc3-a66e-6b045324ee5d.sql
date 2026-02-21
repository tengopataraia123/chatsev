-- Add missing columns to groups table for settings
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS allow_member_invites boolean DEFAULT true;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS allow_moderator_invites boolean DEFAULT true;

-- Add expires_at to group_invites for expiration logic
ALTER TABLE public.group_invites ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '7 days');

-- Create rate limiting table for invite spam protection
CREATE TABLE IF NOT EXISTS public.group_invite_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  invite_count integer DEFAULT 0,
  last_reset timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_invite_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate limits
CREATE POLICY "Users can view own rate limits"
  ON public.group_invite_rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits"
  ON public.group_invite_rate_limits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits"
  ON public.group_invite_rate_limits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_group_invites_group_user ON public.group_invites(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON public.group_invites(status);
CREATE INDEX IF NOT EXISTS idx_group_invite_rate_user ON public.group_invite_rate_limits(user_id);