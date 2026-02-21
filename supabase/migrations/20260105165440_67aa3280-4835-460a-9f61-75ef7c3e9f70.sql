-- Fix RLS policy to allow super_admin to manage roles
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

CREATE POLICY "Only super_admins and admins can manage roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);