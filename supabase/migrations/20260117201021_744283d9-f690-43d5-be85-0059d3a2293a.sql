-- Update existing profiles to use base64-encoded login_email for non-ASCII usernames
-- This ensures existing Georgian usernames work correctly

-- Create a helper function to generate email-safe identifiers
CREATE OR REPLACE FUNCTION public.generate_email_safe_username(username text)
RETURNS text
LANGUAGE plpgsql
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

-- Update the handle_new_user function to use the helper
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, age, gender, login_email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    (new.raw_user_meta_data ->> 'age')::integer,
    new.raw_user_meta_data ->> 'gender',
    LOWER(new.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- Update existing profiles that have non-ASCII usernames
UPDATE public.profiles
SET login_email = generate_email_safe_username(username)
WHERE username IS NOT NULL;