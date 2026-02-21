-- Update the delete policy to include moderator role
DROP POLICY IF EXISTS "Admins can delete any story" ON public.stories;
CREATE POLICY "Staff can delete any story" ON public.stories
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Update the manage policy to include moderator role
DROP POLICY IF EXISTS "Admins can manage all stories" ON public.stories;
CREATE POLICY "Staff can manage all stories" ON public.stories
FOR ALL
USING (
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);