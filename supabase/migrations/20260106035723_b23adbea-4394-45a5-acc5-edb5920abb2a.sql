-- Create policy for admins to update profiles (for approving users)
CREATE POLICY "Admins can update any profile for approval"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin', 'moderator')
  )
);