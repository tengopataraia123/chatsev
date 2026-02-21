
-- Add new columns to site_bans for comprehensive blocking
ALTER TABLE public.site_bans 
ADD COLUMN IF NOT EXISTS block_type TEXT NOT NULL DEFAULT 'USER' CHECK (block_type IN ('USER', 'NICKNAME', 'IP')),
ADD COLUMN IF NOT EXISTS blocked_nickname TEXT,
ADD COLUMN IF NOT EXISTS blocked_ip TEXT,
ADD COLUMN IF NOT EXISTS blocked_by_role TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REMOVED')),
ADD COLUMN IF NOT EXISTS removed_by UUID,
ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_site_bans_status ON public.site_bans(status);
CREATE INDEX IF NOT EXISTS idx_site_bans_nickname ON public.site_bans(blocked_nickname) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_site_bans_ip ON public.site_bans(blocked_ip) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_site_bans_user_id_active ON public.site_bans(user_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_site_bans_expires ON public.site_bans(banned_until) WHERE status = 'ACTIVE';

-- Update RLS policies for site_bans
DROP POLICY IF EXISTS "Admins can view bans" ON public.site_bans;
DROP POLICY IF EXISTS "Admins can create bans" ON public.site_bans;
DROP POLICY IF EXISTS "Admins can update bans" ON public.site_bans;

-- Admins can view all bans
CREATE POLICY "Admins can view all bans"
ON public.site_bans
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Users can view their own ban
CREATE POLICY "Users can view own ban"
ON public.site_bans
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can create bans
CREATE POLICY "Admins can create bans"
ON public.site_bans
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Admins can update bans
CREATE POLICY "Admins can update bans"
ON public.site_bans
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Function to check if user is site banned (comprehensive check)
CREATE OR REPLACE FUNCTION public.check_site_ban(
  _user_id UUID DEFAULT NULL,
  _nickname TEXT DEFAULT NULL,
  _ip TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_banned BOOLEAN,
  ban_id UUID,
  block_type TEXT,
  reason TEXT,
  banned_until TIMESTAMPTZ,
  banned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-expire old bans
  UPDATE public.site_bans
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE' 
    AND banned_until IS NOT NULL 
    AND banned_until < now();

  -- Check for active bans (priority: IP > NICKNAME > USER)
  RETURN QUERY
  SELECT 
    TRUE as is_banned,
    sb.id as ban_id,
    sb.block_type,
    sb.reason,
    sb.banned_until,
    sb.created_at as banned_at
  FROM public.site_bans sb
  WHERE sb.status = 'ACTIVE'
    AND (
      (sb.block_type = 'IP' AND sb.blocked_ip = _ip)
      OR (sb.block_type = 'NICKNAME' AND sb.blocked_nickname = _nickname)
      OR (sb.block_type = 'USER' AND sb.user_id = _user_id)
    )
  ORDER BY 
    CASE sb.block_type 
      WHEN 'IP' THEN 1 
      WHEN 'NICKNAME' THEN 2 
      WHEN 'USER' THEN 3 
    END
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Function to get user's active ban
CREATE OR REPLACE FUNCTION public.get_user_site_ban(_user_id UUID)
RETURNS TABLE (
  is_banned BOOLEAN,
  ban_id UUID,
  block_type TEXT,
  reason TEXT,
  banned_until TIMESTAMPTZ,
  banned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nickname TEXT;
BEGIN
  -- Get user's nickname
  SELECT username INTO _nickname FROM public.profiles WHERE user_id = _user_id;
  
  -- Auto-expire old bans
  UPDATE public.site_bans
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE' 
    AND banned_until IS NOT NULL 
    AND banned_until < now();

  -- Check for active bans
  RETURN QUERY
  SELECT 
    TRUE as is_banned,
    sb.id as ban_id,
    sb.block_type,
    sb.reason,
    sb.banned_until,
    sb.created_at as banned_at
  FROM public.site_bans sb
  WHERE sb.status = 'ACTIVE'
    AND (
      (sb.block_type = 'NICKNAME' AND sb.blocked_nickname = _nickname)
      OR (sb.block_type = 'USER' AND sb.user_id = _user_id)
    )
  ORDER BY 
    CASE sb.block_type 
      WHEN 'NICKNAME' THEN 1 
      WHEN 'USER' THEN 2 
    END
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Enable realtime for site_bans
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_bans;
