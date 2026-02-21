-- Drop conflicting policies
DROP POLICY IF EXISTS "Admins can ban users" ON public.site_bans;
DROP POLICY IF EXISTS "Admins can create bans" ON public.site_bans;

-- Create single unified INSERT policy
CREATE POLICY "Admins can create site bans"
ON public.site_bans
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
);