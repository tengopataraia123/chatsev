-- Drop the problematic policies
DROP POLICY IF EXISTS "Members can view group members" ON public.messenger_group_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.messenger_group_members;
DROP POLICY IF EXISTS "Members can be removed" ON public.messenger_group_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.messenger_group_members;

-- Create a SECURITY DEFINER function to check membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_messenger_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messenger_group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- Create a SECURITY DEFINER function to check admin/moderator role
CREATE OR REPLACE FUNCTION public.is_messenger_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messenger_group_members 
    WHERE group_id = p_group_id 
      AND user_id = p_user_id 
      AND role IN ('admin', 'moderator')
  );
$$;

-- Create new non-recursive policies
-- SELECT: Members can view members of groups they belong to
CREATE POLICY "Members can view group members"
ON public.messenger_group_members
FOR SELECT
USING (
  public.is_messenger_group_member(group_id, auth.uid())
);

-- INSERT: Users can add themselves, or admins can add others
CREATE POLICY "Admins can add members"
ON public.messenger_group_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.is_messenger_group_admin(group_id, auth.uid())
);

-- UPDATE: Only admins can update member records
CREATE POLICY "Admins can update members"
ON public.messenger_group_members
FOR UPDATE
USING (
  public.is_messenger_group_admin(group_id, auth.uid())
);

-- DELETE: Members can leave themselves, or admins can remove others
CREATE POLICY "Members can be removed"
ON public.messenger_group_members
FOR DELETE
USING (
  user_id = auth.uid() 
  OR public.is_messenger_group_admin(group_id, auth.uid())
);