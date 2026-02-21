-- Add policy for users to delete their own private messages
CREATE POLICY "Users can delete their own private messages"
ON public.private_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Add policy for users to delete their own group chat messages
CREATE POLICY "Users can delete their own group messages"
ON public.group_chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Add moderator delete policy for group chat
CREATE POLICY "Moderators can delete group messages"
ON public.group_chat_messages
FOR DELETE
USING (has_role(auth.uid(), 'moderator'::app_role));