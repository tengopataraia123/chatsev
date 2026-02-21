-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Active dating users can view other active profiles" ON public.dating_profiles;

-- Drop redundant overlapping policies  
DROP POLICY IF EXISTS "Users can view active dating profiles" ON public.dating_profiles;
DROP POLICY IF EXISTS "Users can view own dating profile" ON public.dating_profiles;

-- Create a simple, non-recursive SELECT policy
CREATE POLICY "Users can view dating profiles" 
ON public.dating_profiles 
FOR SELECT 
USING (
  user_id = auth.uid()  -- Own profile
  OR is_active = true   -- Active profiles
);