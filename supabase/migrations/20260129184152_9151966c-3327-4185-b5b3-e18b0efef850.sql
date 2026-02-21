-- Create function to auto-create pending_approval for new registrations
CREATE OR REPLACE FUNCTION public.auto_create_registration_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create for users that need approval (is_approved = false)
  IF NEW.is_approved = FALSE THEN
    -- Check if a pending approval already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.pending_approvals 
      WHERE user_id = NEW.user_id 
      AND type = 'registration'
      AND status = 'pending'
    ) THEN
      -- Create pending approval with username from profile
      INSERT INTO public.pending_approvals (
        type,
        user_id,
        content_id,
        content_data,
        status
      ) VALUES (
        'registration',
        NEW.user_id,
        NULL,
        jsonb_build_object(
          'username', NEW.username,
          'age', NEW.age,
          'gender', NEW.gender,
          'city', NEW.city,
          'birthday', NEW.birthday
        ),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_create_approval ON public.profiles;
CREATE TRIGGER on_profile_created_create_approval
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_registration_approval();

-- Also create pending approvals for existing unapproved users who don't have one
INSERT INTO public.pending_approvals (type, user_id, content_data, status)
SELECT 
  'registration',
  p.user_id,
  jsonb_build_object(
    'username', p.username,
    'age', p.age,
    'gender', p.gender,
    'city', p.city,
    'birthday', p.birthday
  ),
  'pending'
FROM public.profiles p
WHERE p.is_approved = false
AND NOT EXISTS (
  SELECT 1 FROM public.pending_approvals pa 
  WHERE pa.user_id = p.user_id 
  AND pa.type = 'registration'
);