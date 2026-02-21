-- Fix: Add explicit DELETE policy for admins on stories
CREATE POLICY "Admins can delete any story"
ON public.stories
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);