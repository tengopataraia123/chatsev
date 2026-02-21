-- Update RLS policies for ad_violations to include super_admin
DROP POLICY IF EXISTS "Admins can view all violations" ON public.ad_violations;
DROP POLICY IF EXISTS "Admins can update violations" ON public.ad_violations;

CREATE POLICY "Admins can view all violations" ON public.ad_violations
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Admins can update violations" ON public.ad_violations
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);