-- Fix the get_user_site_ban function - column reference was ambiguous
CREATE OR REPLACE FUNCTION get_user_site_ban(_user_id uuid)
RETURNS TABLE(
  is_banned boolean,
  ban_id uuid,
  block_type text,
  reason text,
  banned_until timestamptz,
  banned_at timestamptz
) AS $$
BEGIN
  -- First, update expired bans
  UPDATE public.site_bans sb
  SET status = 'EXPIRED'
  WHERE sb.status = 'ACTIVE' 
    AND sb.banned_until IS NOT NULL 
    AND sb.banned_until < now();

  -- Return active ban for the user
  RETURN QUERY
  SELECT 
    true AS is_banned,
    sb.id AS ban_id,
    sb.block_type,
    sb.reason,
    sb.banned_until,
    sb.created_at AS banned_at
  FROM public.site_bans sb
  WHERE sb.user_id = _user_id
    AND sb.status = 'ACTIVE'
  ORDER BY sb.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;