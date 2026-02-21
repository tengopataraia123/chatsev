CREATE POLICY "Admins can delete any gallery photos"
ON public.user_gallery
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'moderator'::app_role])
  )
);