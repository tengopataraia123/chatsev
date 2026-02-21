
-- FIX: Profiles RLS - make profiles visible again
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view others profiles based on privacy" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);
