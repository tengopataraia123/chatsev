-- Add RLS policy for super admins/admins to update any user's privacy settings
CREATE POLICY "Admins can update any user privacy settings"
ON public.privacy_settings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Also add INSERT policy for admins to create privacy settings for users
CREATE POLICY "Admins can insert privacy settings for any user"
ON public.privacy_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);