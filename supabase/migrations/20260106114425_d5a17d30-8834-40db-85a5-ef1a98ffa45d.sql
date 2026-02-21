-- Fix has_role function to make super_admin include admin privileges
CREATE OR REPLACE FUNCTION public.has_role(_role app_role, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- super_admin has all roles
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- admin has admin and lower roles
  IF _role IN ('admin', 'moderator', 'user') AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- moderator has moderator and user roles
  IF _role IN ('moderator', 'user') AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'moderator'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check exact role match
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;