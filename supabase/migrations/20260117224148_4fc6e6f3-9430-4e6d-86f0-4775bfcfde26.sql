-- Allow anonymous users to lookup login_email by username for authentication
CREATE POLICY "Anyone can lookup login_email by username"
ON public.profiles
FOR SELECT
USING (true);

-- Drop the old policy that only allowed authenticated users
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;