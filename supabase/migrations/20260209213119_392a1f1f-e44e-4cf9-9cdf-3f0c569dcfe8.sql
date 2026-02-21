
-- Drop old insert policy
DROP POLICY IF EXISTS "groups_insert" ON public.groups;

-- Create new insert policy: only super admins can create groups
CREATE POLICY "groups_insert" ON public.groups FOR INSERT
  WITH CHECK (
    auth.uid() = owner_user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );
