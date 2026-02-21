-- Create trigger function to auto-create privacy settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_privacy_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (since profiles are created when users sign up)
CREATE TRIGGER on_profile_created_create_privacy_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_privacy_settings();