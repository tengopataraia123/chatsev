-- Create a security definer function specifically for friend_group_members
CREATE OR REPLACE FUNCTION public.is_friend_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM friend_group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  )
$$;

-- SELECT policy: users can see members of groups they belong to
CREATE POLICY "Users can view members of their groups"
ON friend_group_members FOR SELECT
USING (
  public.is_friend_group_member(group_id, auth.uid())
);

-- INSERT policy: group creators and admins can add members
CREATE POLICY "Group admins can add members"
ON friend_group_members FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  public.is_group_admin_or_creator(group_id, auth.uid())
);

-- DELETE policy: admins can remove members, users can leave
CREATE POLICY "Users can leave or admins can remove"
ON friend_group_members FOR DELETE
USING (
  user_id = auth.uid() OR
  public.is_group_admin_or_creator(group_id, auth.uid())
);