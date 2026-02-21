-- Fix the broken INSERT policy for friend_group_members
DROP POLICY IF EXISTS "Group admins can add members" ON friend_group_members;

-- Create corrected policy: group creator can add members OR existing admins can add members
CREATE POLICY "Group admins and creators can add members" 
ON friend_group_members FOR INSERT
WITH CHECK (
  -- User can add themselves
  user_id = auth.uid()
  OR 
  -- Group admins can add others
  EXISTS (
    SELECT 1 FROM friend_group_members m
    WHERE m.group_id = friend_group_members.group_id 
    AND m.user_id = auth.uid() 
    AND m.role = 'admin'
  )
  OR
  -- Group creator can add members (even if not yet in members table)
  EXISTS (
    SELECT 1 FROM friend_groups g
    WHERE g.id = friend_group_members.group_id 
    AND g.created_by = auth.uid()
  )
);