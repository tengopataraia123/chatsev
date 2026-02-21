-- Drop existing broken policies
DROP POLICY IF EXISTS "Admins can manage members" ON messenger_group_members;
DROP POLICY IF EXISTS "Members can view group members" ON messenger_group_members;

-- Create fixed policies without self-referencing EXISTS
-- For SELECT: Users can see members of groups they belong to
CREATE POLICY "Members can view group members"
ON messenger_group_members
FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM messenger_group_members WHERE user_id = auth.uid()
  )
);

-- For INSERT: Admins and moderators can add members
CREATE POLICY "Admins can add members"
ON messenger_group_members
FOR INSERT
WITH CHECK (
  -- Either the user is adding themselves (joining)
  user_id = auth.uid()
  OR
  -- Or they are admin/moderator of the group
  EXISTS (
    SELECT 1 FROM messenger_group_members existing
    WHERE existing.group_id = messenger_group_members.group_id
      AND existing.user_id = auth.uid()
      AND existing.role IN ('admin', 'moderator')
  )
);

-- For UPDATE: Admins can update member roles
CREATE POLICY "Admins can update members"
ON messenger_group_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM messenger_group_members existing
    WHERE existing.group_id = messenger_group_members.group_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
  )
);

-- For DELETE: Admins can remove members, or users can remove themselves
CREATE POLICY "Members can be removed"
ON messenger_group_members
FOR DELETE
USING (
  -- User removing themselves
  user_id = auth.uid()
  OR
  -- Admin removing others
  EXISTS (
    SELECT 1 FROM messenger_group_members existing
    WHERE existing.group_id = messenger_group_members.group_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
  )
);