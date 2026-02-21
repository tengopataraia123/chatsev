-- Add RLS policy for super admins to update any message
CREATE POLICY "Super admins can update messages"
  ON group_chat_messages
  FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Also add policy for users to update their own messages
CREATE POLICY "Users can update their own messages"
  ON group_chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);