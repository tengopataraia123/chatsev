-- Drop existing delete policies that are too restrictive
DROP POLICY IF EXISTS "Users can delete their polls" ON polls;
DROP POLICY IF EXISTS "Users can delete own activities" ON user_activities;

-- Create new delete policies that allow owners AND admins to delete

-- Polls: owners and admins can delete
CREATE POLICY "Users and admins can delete polls"
ON polls FOR DELETE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- User activities: owners and admins can delete  
CREATE POLICY "Users and admins can delete activities"
ON user_activities FOR DELETE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
);