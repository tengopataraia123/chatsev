-- Drop existing insert policy and create a more permissive one
DROP POLICY IF EXISTS "Anyone can create pending approvals" ON public.pending_approvals;

-- Allow authenticated users to insert pending approvals for themselves
CREATE POLICY "Users can create their own pending approvals"
ON public.pending_approvals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a trigger function to automatically create pending approval on new registration
CREATE OR REPLACE FUNCTION public.create_registration_pending_approval()
RETURNS TRIGGER AS $$
DECLARE
  ip_addr text := NULL;
BEGIN
  INSERT INTO public.pending_approvals (
    type,
    user_id,
    content_data,
    status
  ) VALUES (
    'registration',
    NEW.user_id,
    jsonb_build_object(
      'username', NEW.username,
      'age', NEW.age,
      'gender', NEW.gender
    ),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table to auto-create pending approval
DROP TRIGGER IF EXISTS on_new_profile_create_approval ON public.profiles;
CREATE TRIGGER on_new_profile_create_approval
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_registration_pending_approval();

-- Create pending approvals for all existing unapproved users
INSERT INTO public.pending_approvals (type, user_id, content_data, status, created_at)
SELECT 
  'registration',
  p.user_id,
  jsonb_build_object('username', p.username, 'age', p.age, 'gender', p.gender),
  'pending',
  p.created_at
FROM public.profiles p
WHERE p.is_approved = false
  AND NOT EXISTS (
    SELECT 1 FROM public.pending_approvals pa 
    WHERE pa.user_id = p.user_id AND pa.type = 'registration'
  );