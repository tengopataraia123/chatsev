-- Add UPDATE policy for conversations so users can update updated_at when sending messages
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id))
WITH CHECK ((auth.uid() = user1_id) OR (auth.uid() = user2_id));