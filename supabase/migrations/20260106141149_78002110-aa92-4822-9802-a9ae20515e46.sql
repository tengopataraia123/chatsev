-- Add is_invisible column to privacy_settings table
ALTER TABLE public.privacy_settings
ADD COLUMN is_invisible BOOLEAN DEFAULT FALSE;

-- Create a helper function to get safe presence info for public viewing
-- This returns sanitized presence data, hiding invisible users
CREATE OR REPLACE FUNCTION public.get_public_presence(target_user_id UUID, viewer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_invisible_user BOOLEAN;
  actual_online_visible_until TIMESTAMPTZ;
  actual_last_seen TIMESTAMPTZ;
  result JSONB;
BEGIN
  -- Check if target user is invisible
  SELECT COALESCE(ps.is_invisible, FALSE)
  INTO is_invisible_user
  FROM public.privacy_settings ps
  WHERE ps.user_id = target_user_id;
  
  -- Get actual presence data
  SELECT p.online_visible_until, p.last_seen
  INTO actual_online_visible_until, actual_last_seen
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
  
  -- If user is viewing their own profile, show real data
  IF target_user_id = viewer_id THEN
    RETURN jsonb_build_object(
      'is_online', actual_online_visible_until > now(),
      'online_visible_until', actual_online_visible_until,
      'last_seen', actual_last_seen,
      'is_invisible', is_invisible_user
    );
  END IF;
  
  -- For invisible users, return offline status (NEVER expose is_invisible to others)
  IF is_invisible_user THEN
    RETURN jsonb_build_object(
      'is_online', FALSE,
      'online_visible_until', NULL,
      'last_seen', NULL
    );
  END IF;
  
  -- Normal user - return actual data (without is_invisible field)
  RETURN jsonb_build_object(
    'is_online', actual_online_visible_until > now(),
    'online_visible_until', actual_online_visible_until,
    'last_seen', actual_last_seen
  );
END;
$$;