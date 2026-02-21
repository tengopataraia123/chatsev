-- Add DELETE policy for messenger_conversations table
CREATE POLICY "Users can delete own conversations"
ON public.messenger_conversations
FOR DELETE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);