-- Drop the problematic policy
DROP POLICY IF EXISTS "Group admins and creators can add members" ON friend_group_members;

-- Create a security definer function to check if user is group admin
CREATE OR REPLACE FUNCTION public.is_group_admin_or_creator(_group_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_group_members
    WHERE group_id = _group_id 
    AND user_id = _user_id 
    AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM friend_groups
    WHERE id = _group_id 
    AND created_by = _user_id
  )
$$;

-- Create corrected INSERT policy using the function
CREATE POLICY "Users can add members to groups" 
ON friend_group_members FOR INSERT
WITH CHECK (
  -- User can add themselves
  user_id = auth.uid()
  OR 
  -- Or user is admin/creator of the group
  public.is_group_admin_or_creator(group_id, auth.uid())
);