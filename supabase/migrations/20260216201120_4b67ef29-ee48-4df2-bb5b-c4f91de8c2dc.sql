-- Add DELETE policy for super admins on reports table
CREATE POLICY "Super admins can delete reports"
ON public.reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'::app_role
  )
);