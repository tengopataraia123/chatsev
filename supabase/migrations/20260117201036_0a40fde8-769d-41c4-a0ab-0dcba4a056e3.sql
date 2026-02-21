-- Fix search_path for the generate_email_safe_username function
CREATE OR REPLACE FUNCTION public.generate_email_safe_username(username text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- For ASCII-only usernames, keep the simple format for backwards compatibility
  IF username ~ '^[a-zA-Z0-9_]+$' THEN
    RETURN LOWER(username) || '@metanetwork.local';
  ELSE
    -- For non-ASCII (like Georgian), encode to base64
    RETURN REPLACE(REPLACE(REPLACE(encode(convert_to(LOWER(username), 'UTF8'), 'base64'), '+', '_'), '/', '_'), '=', '_') || '@metanetwork.local';
  END IF;
END;
$$;